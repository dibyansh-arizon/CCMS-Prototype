// ---------------------------------------------------------------------------
// CCMS workflow engine – implements the Carnegie Master Workflow (8 stages).
// Pure functions: (record, ctx, payload) -> new record. Throws WorkflowError on
// any rule violation so the UI can show the reason. Every change is written to
// the record's activity history (the audit trail shown on each Change Control).
//
// ctx = { user, eff (ids the user may act for), effUsers, now (Date), signature?,
//         settings, issueNumber(), nextDraft() }
// ---------------------------------------------------------------------------
import { ASSESSMENTS, ASSESSMENT_BY_KEY, STATUS as S, RISK_QUESTIONS, CLOSEOUT_QUESTIONS, EXTENSION_LEVELS } from './data/forms.js';
import { USERS, DEPT_HEAD, userById, ROLES } from './data/people.js';

export class WorkflowError extends Error {}
const fail = (m) => {
  throw new WorkflowError(m);
};
const clone = (o) => JSON.parse(JSON.stringify(o));
let _n = 0;
export const uid = (p) => `${p}-${Date.now().toString(36)}${(_n++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
const addBusinessDays = (d, n) => {
  const x = new Date(d);
  let left = n;
  while (left > 0) {
    x.setUTCDate(x.getUTCDate() + 1);
    const wd = x.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return x;
};
export const stripTime = (d) => isoDate(d);

function log(r, ctx, action, detail = '', meaning = null) {
  r.history.push({
    id: uid('ev'),
    at: ctx.now.toISOString(),
    actorId: ctx.user.id,
    actor: ctx.user.name,
    role: ROLES[ctx.user.roleId].label,
    action,
    detail,
    signature: meaning
      ? { meaning: ctx.signature?.meaning || meaning, signer: ctx.user.name, at: ctx.now.toISOString(), onBehalfOf: ctx.onBehalfOf || null }
      : null,
  });
}
const hasRole = (ctx, ...roles) => ctx.effUsers.some((u) => roles.includes(u.roleId));
const requireText = (v, msg) => {
  if (!v || !String(v).trim()) fail(msg);
};

// ------------------------------------------------------------------ stage mapping
export function stageOf(r) {
  switch (r.status) {
    case S.DRAFT:
    case S.PEND_ENDORSE:
      return 1;
    case S.PEND_SCREEN:
      return 2;
    case S.ASSESS:
      return 3;
    case S.REG:
      return 4;
    case S.CONSOL:
      return 5;
    case S.QA_APPROVAL:
      return 6;
    case S.IMPL:
      return 7;
    case S.CLOSEOUT:
      return 8;
    case S.CLOSED:
      return 9;
    case S.RETURNED:
      return r.returnStage || 1;
    default:
      return r.stoppedStage || 1;
  }
}
export const isFinal = (r) => [S.CLOSED, S.REJECTED, S.CANCELLED].includes(r.status);
export const isOverdue = (a, now = new Date()) => a.due && a.status !== 'Completed' && a.status !== 'Planned' && a.due < isoDate(now);

// ------------------------------------------------------------------ permissions (used by engine and UI)
export function perms(r, ctx) {
  const eff = ctx.eff;
  const isInit = eff.includes(r.initiatorId);
  const qa = hasRole(ctx, 'qa_designee', 'qa_head') && !isInit;
  const allDone = r.actions.filter((a) => a.status !== 'Cancelled').every((a) => a.status === 'Completed');
  return {
    isInitiator: isInit,
    edit: isInit && [S.DRAFT, S.RETURNED].includes(r.status),
    endorse: r.status === S.PEND_ENDORSE && eff.includes(DEPT_HEAD[r.department]) && !isInit,
    screen: r.status === S.PEND_SCREEN && qa,
    assessKeys:
      r.status === S.ASSESS
        ? r.assessments.filter((a) => a.status === 'Pending' && a.assignees.some((id) => eff.includes(id))).map((a) => a.key)
        : [],
    respondKeys: r.status === S.ASSESS && isInit ? r.assessments.filter((a) => a.status === 'Clarification Requested').map((a) => a.key) : [],
    resolveKeys: r.status === S.ASSESS && qa ? r.assessments.filter((a) => a.status === 'Not Acceptable').map((a) => a.key) : [],
    regulatory: r.status === S.REG && hasRole(ctx, 'ra_head') && !(r.reg?.clarification && !r.reg.clarification.a),
    regRespond: r.status === S.REG && isInit && !!r.reg?.clarification && !r.reg.clarification.a,
    consolidate: r.status === S.CONSOL && isInit,
    approve: r.status === S.QA_APPROVAL && hasRole(ctx, 'qa_head') && !isInit,
    closeout: r.status === S.CLOSEOUT && qa,
    cancel: [S.IMPL, S.CLOSEOUT].includes(r.status) && hasRole(ctx, 'qa_head') && !isInit,
    verify: r.status === S.IMPL && isInit && allDone && r.actions.length > 0 && !r.amendments.some((a) => a.status === 'Pending'),
    allDone,
    manageActions: ([S.CONSOL, S.QA_APPROVAL, S.IMPL].includes(r.status) || (r.status === S.RETURNED && r.returnStage === 6)) && (isInit || hasRole(ctx, 'qa_designee', 'qa_head')),
    requestExtension: r.status === S.IMPL && isInit,
    requestAmendment: r.status === S.IMPL && isInit,
    decideAmendment: r.status === S.IMPL && hasRole(ctx, 'qa_designee', 'qa_head') && !isInit,
  };
}
export const canWorkOnAction = (r, a, ctx) =>
  ctx.eff.includes(a.ownerId) &&
  (((r.status === S.IMPL || (r.status === S.RETURNED && r.returnStage === 8)) && a.status !== 'Planned') || (a.kind === 'client' && [S.REG, S.CONSOL, S.QA_APPROVAL, S.IMPL].includes(r.status)));

// Assessment content is only visible to its own reviewers while assessments are running
export function canViewAssessment(r, a, ctx) {
  if (ctx.user.roleId === 'auditor') return true;
  if (a.assignees.some((id) => ctx.eff.includes(id))) return true;
  return ![S.ASSESS].includes(r.status) && stageOf(r) > 3;
}

// ------------------------------------------------------------------ helpers
export const deptHead = (r) => userById(DEPT_HEAD[r.department]);
function assigneesFor(def, r) {
  if (def.key === 'training') return [DEPT_HEAD[r.department]];
  return USERS.filter((u) => def.roles.includes(u.roleId)).map((u) => u.id);
}
export function assigneeLabel(r, a) {
  const names = a.assignees.map((id) => userById(id)?.name).filter(Boolean);
  return names.length > 1 ? `${names.join(' or ')}` : names[0] || '';
}
const approvedBase = (r) => (r.approvedAt ? new Date(r.approvedAt) : null);
function actionDue(r, a) {
  if (a.due) return a.due;
  if (a.durationDays && r.approvedAt) return isoDate(addDays(r.approvedAt, a.durationDays));
  return null;
}
export function latestActionDue(r, basis) {
  let max = null;
  r.actions
    .filter((a) => a.status !== 'Cancelled')
    .forEach((a) => {
      const d = a.due || (a.durationDays && basis ? isoDate(addDays(basis, a.durationDays)) : null);
      if (d && (!max || d > max)) max = d;
    });
  return max;
}

function newAction(r, ctx, p) {
  requireText(p.description, 'Action description is required.');
  if (!p.ownerId) fail('Select an owner for every action item.');
  if (!p.due && !p.durationDays) fail('Give every action a due date or a duration in days.');
  r.actionSeq = (r.actionSeq || 0) + 1;
  const a = {
    id: `ACT-${String(r.actionSeq).padStart(2, '0')}`,
    source: p.source,
    sourceKey: p.sourceKey || null,
    kind: p.kind || 'task',
    description: p.description.trim(),
    ownerId: p.ownerId,
    due: p.due || null,
    durationDays: p.due ? null : Number(p.durationDays),
    status: r.approvedAt ? 'Not Started' : 'Planned',
    comment: '',
    evidence: [],
    createdBy: ctx.user.name,
    createdAt: ctx.now.toISOString(),
  };
  if (a.durationDays && r.approvedAt) a.due = isoDate(addDays(r.approvedAt, a.durationDays));
  r.actions.push(a);
  log(r, ctx, 'Action item added', `${a.id} · ${a.description} → ${userById(a.ownerId)?.name} · ${a.due ? 'due ' + a.due : a.durationDays + ' days after approval'} (${p.source})`);
  return a;
}

// ------------------------------------------------------------------ Stage 1: initiation & endorsement
export function createDraft(ctx, form) {
  const r = {
    id: uid('cc'),
    draftId: ctx.nextDraft(),
    ccNumber: null,
    status: S.DRAFT,
    initiatorId: ctx.user.id,
    initiatorName: ctx.user.name,
    department: ctx.user.dept,
    dateRequested: isoDate(ctx.now),
    title: '', type: '', otherType: '', currentDoc: '', proposedDoc: '', supportingDocs: '',
    description: '', currentState: '', proposedChange: '', justification: '',
    layoutPlan: false, sopNumber: '',
    attachments: [], assessments: [], reg: null, actions: [], actionSeq: 0,
    risk: null, closeout: null, extensions: [], amendments: [], consolidation: null,
    approvedAt: null, dueDate: null, closedAt: null, history: [],
  };
  Object.assign(r, pickForm(form));
  log(r, ctx, 'Draft created', `Temporary ID ${r.draftId}`);
  return r;
}
const FORM_FIELDS = ['title', 'type', 'otherType', 'currentDoc', 'proposedDoc', 'supportingDocs', 'description', 'currentState', 'proposedChange', 'justification', 'layoutPlan', 'attachments'];
const pickForm = (f) => Object.fromEntries(FORM_FIELDS.filter((k) => f[k] !== undefined).map((k) => [k, f[k]]));

export function saveDraft(rec, ctx, form) {
  if (!perms(rec, ctx).edit) fail('Only the initiator can edit a draft or a request returned for correction.');
  const r = clone(rec);
  Object.assign(r, pickForm(form));
  log(r, ctx, 'Draft saved');
  return r;
}

export function submit(rec, ctx, form) {
  if (!perms(rec, ctx).edit) fail('Only the initiator can submit this request.');
  const r = clone(rec);
  if (form) Object.assign(r, pickForm(form));
  requireText(r.title, 'Title of the Change Control is required.');
  if (!r.type) fail('Select the Type of Change.');
  if (r.type === 'Other') requireText(r.otherType, 'Describe the type of change (Other).');
  requireText(r.description, 'Change details and description are required.');
  requireText(r.currentState, 'Current state is required.');
  requireText(r.proposedChange, 'Proposed change is required.');
  requireText(r.justification, 'Justification is required.');
  const from = r.status;
  const target = from === S.DRAFT ? S.PEND_ENDORSE : { 1: S.PEND_ENDORSE, 2: S.PEND_SCREEN, 6: S.QA_APPROVAL, 8: S.CLOSEOUT }[r.returnStage] || S.PEND_ENDORSE;
  r.status = target;
  const toName = { [S.PEND_ENDORSE]: 'Department Head', [S.PEND_SCREEN]: 'QA', [S.QA_APPROVAL]: 'QA for final approval', [S.CLOSEOUT]: 'QA for closeout' }[target];
  log(r, ctx, from === S.DRAFT ? 'Submitted to Department Head' : 'Corrected and resubmitted', `Routed to ${toName}`, 'Authorship and submission');
  r.returnNote = null;
  r.returnStage = null;
  return r;
}

export function endorse(rec, ctx, { decision, comment }) {
  if (!perms(rec, ctx).endorse) fail('Only the initiating Department Head can endorse this request.');
  const r = clone(rec);
  if (decision === 'endorse') {
    r.status = S.PEND_SCREEN;
    log(r, ctx, 'Endorsed by Department Head', (comment || '') + ' Endorsement does not authorize implementation.', 'Endorsement');
  } else if (decision === 'return') {
    requireText(comment, 'A comment is required when returning for correction.');
    r.status = S.RETURNED;
    r.returnStage = 1;
    r.returnNote = { by: ctx.user.name, comment, at: ctx.now.toISOString(), from: 'Department Head' };
    log(r, ctx, 'Returned for correction by Department Head', comment);
  } else if (decision === 'reject') {
    requireText(comment, 'Justification is mandatory when rejecting.');
    r.status = S.REJECTED;
    r.stoppedStage = 1;
    log(r, ctx, 'Rejected by Department Head', comment, 'Rejection');
  } else fail('Choose Endorse, Return for Correction or Reject.');
  return r;
}

// ------------------------------------------------------------------ Stage 2: QA screening & CC number
export function screen(rec, ctx, { decision, comment, remarks, checks }) {
  if (!perms(rec, ctx).screen) fail('Only QA (not the initiator) can screen this request.');
  const r = clone(rec);
  if (decision === 'accept') {
    if (!checks || !checks.complete || !checks.justified || !checks.noDuplicate) fail('Confirm completeness, justification and duplicate check before accepting.');
    r.ccNumber = ctx.issueNumber();
    r.issuedBy = ctx.user.name;
    r.issuedAt = ctx.now.toISOString();
    r.qaRemarks = remarks || '';
    r.status = S.ASSESS;
    r.assessments = ASSESSMENTS.map((def) => ({
      key: def.key,
      name: def.name,
      assignees: assigneesFor(def, r),
      status: 'Pending',
      answers: {},
      comments: '',
      decision: null,
      justification: '',
      clarifications: [],
      completedBy: null,
      completedAt: null,
    }));
    log(r, ctx, 'Accepted by QA – official CC number issued', `${r.ccNumber}. Sent simultaneously to all ${r.assessments.length} designated Department Heads.`, 'Screening acceptance and number issuance');
  } else if (decision === 'return') {
    requireText(comment, 'A comment is required when returning for correction.');
    r.status = S.RETURNED;
    r.returnStage = 2;
    r.returnNote = { by: ctx.user.name, comment, at: ctx.now.toISOString(), from: 'QA Screening' };
    log(r, ctx, 'Returned for correction by QA', comment);
  } else if (decision === 'reject') {
    requireText(comment, 'Justification is mandatory when rejecting.');
    r.status = S.REJECTED;
    r.stoppedStage = 2;
    log(r, ctx, 'Rejected by QA', comment, 'Rejection');
  } else fail('Choose Accept, Return for Correction or Reject.');
  return r;
}

// ------------------------------------------------------------------ Stage 3: parallel departmental assessment
function fieldVisible(def, f, answers) {
  if (!f.dependsOn) return true;
  return answers[f.dependsOn.field] === f.dependsOn.value;
}
export function assess(rec, ctx, key, p) {
  if (!perms(rec, ctx).assessKeys.includes(key)) fail('This assessment is not assigned to you, or it is not open.');
  const r = clone(rec);
  const a = r.assessments.find((x) => x.key === key);
  const def = ASSESSMENT_BY_KEY[key];
  const who = (ctx.onBehalfOf ? ` (on behalf of ${ctx.onBehalfOf})` : '');
  if (p.decision === 'clarify') {
    requireText(p.clarificationText, 'State what clarification you need from the initiator.');
    a.status = 'Clarification Requested';
    a.clarifications.push({ q: p.clarificationText, by: ctx.user.name, at: ctx.now.toISOString(), a: null, answeredAt: null });
    a.answers = p.answers || a.answers;
    log(r, ctx, `${def.shortName}: clarification requested`, `${p.clarificationText} Only this assessment is paused; other assessments continue.${who}`);
    return r;
  }
  if (!['accept', 'accept_action', 'reject'].includes(p.decision)) fail('Select a decision: Accept without Action, Accept with Action, Request Clarification or Not Acceptable.');
  const answers = p.answers || {};
  def.fields.forEach((f) => {
    if (!fieldVisible(def, f, answers)) return;
    const v = answers[f.id];
    const missing = f.type === 'multi' ? !v || v.length === 0 : !v;
    if (missing) fail(`Please answer: "${f.label}"`);
    if (f.otherText && ((f.type === 'multi' && v.includes('Other')) || v === 'Other')) requireText(answers[f.id + 'Other'], 'Specify the "Other" entry.');
  });
  a.answers = answers;
  a.comments = p.comments || '';
  a.decision = p.decision;
  if (p.decision === 'reject') {
    requireText(p.justification, 'Justification is mandatory for Not Acceptable.');
    a.status = 'Not Acceptable';
    a.justification = p.justification;
    log(r, ctx, `${def.shortName}: marked Not Acceptable`, `${p.justification} Referred to QA for resolution.${who}`, 'Assessment decision');
    return r;
  }
  if (p.decision === 'accept_action') {
    if (!p.actions || p.actions.length === 0) fail('Accept with Action requires at least one action item.');
    p.actions.forEach((x) => newAction(r, ctx, { ...x, source: def.shortName, sourceKey: key }));
    a.status = 'Accepted with Action';
  } else {
    a.status = 'Accepted';
  }
  a.completedBy = ctx.user.name;
  a.completedAt = ctx.now.toISOString();
  log(r, ctx, `${def.shortName}: ${a.status}`, (a.comments || '') + who, 'Assessment decision');
  advanceIfAssessed(r, ctx);
  return r;
}
function advanceIfAssessed(r, ctx) {
  if (r.status === S.ASSESS && r.assessments.every((x) => ['Accepted', 'Accepted with Action'].includes(x.status))) {
    r.status = S.REG;
    log(r, ctx, 'All departmental assessments completed', 'Change Control moved to Regulatory Assessment.');
  }
}
export function respondClarification(rec, ctx, key, text) {
  if (!perms(rec, ctx).respondKeys.includes(key)) fail('No clarification is waiting for you on this assessment.');
  requireText(text, 'Enter your response.');
  const r = clone(rec);
  const a = r.assessments.find((x) => x.key === key);
  const c = a.clarifications[a.clarifications.length - 1];
  c.a = text;
  c.answeredAt = ctx.now.toISOString();
  a.status = 'Pending';
  log(r, ctx, `${ASSESSMENT_BY_KEY[key].shortName}: clarification answered`, text);
  return r;
}
export function resolveNotAcceptable(rec, ctx, key, { outcome, note }) {
  if (!perms(rec, ctx).resolveKeys.includes(key)) fail('Only QA can resolve a Not Acceptable assessment.');
  requireText(note, 'Record the QA resolution rationale.');
  const r = clone(rec);
  const a = r.assessments.find((x) => x.key === key);
  const name = ASSESSMENT_BY_KEY[key].shortName;
  if (outcome === 'reassess') {
    a.status = 'Pending';
    log(r, ctx, `${name}: QA resolution – sent back to reviewer for reassessment`, note, 'QA resolution');
  } else if (outcome === 'return') {
    r.status = S.RETURNED;
    r.returnStage = 1;
    r.returnNote = { by: ctx.user.name, comment: `${name} not acceptable: ${a.justification} — QA: ${note}`, at: ctx.now.toISOString(), from: 'QA resolution' };
    a.status = 'Pending';
    log(r, ctx, `${name}: QA resolution – returned to initiator`, note, 'QA resolution');
  } else if (outcome === 'reject') {
    r.status = S.REJECTED;
    r.stoppedStage = 3;
    log(r, ctx, `${name}: QA resolution – Change Control rejected`, note, 'QA resolution');
  } else fail('Choose a resolution outcome.');
  return r;
}

// ------------------------------------------------------------------ Stage 4: regulatory assessment & client requirements
export function regulatory(rec, ctx, p) {
  if (!perms(rec, ctx).regulatory) fail('Only Regulatory Affairs can complete this assessment.');
  const r = clone(rec);
  if (p.decision === 'clarify') {
    requireText(p.clarificationText, 'State what clarification you need.');
    r.reg = { ...(r.reg || {}), clarification: { q: p.clarificationText, by: ctx.user.name, at: ctx.now.toISOString(), a: null } };
    log(r, ctx, 'Regulatory Affairs: clarification requested', p.clarificationText);
    return r;
  }
  if (!p.andaStatus) fail('Select the ANDA/DMF Application Status.');
  if (!p.applicable) fail('Select whether the Regulatory Assessment is Applicable or Not Applicable.');
  if (p.applicable === 'Applicable' && (!p.reporting || p.reporting.length === 0)) fail('Select at least one reporting criterion.');
  if (typeof p.regActionRequired !== 'boolean' || typeof p.clientRequired !== 'boolean') fail('Answer both: "Regulatory action required?" and "Client approval required?"');
  if (p.regActionRequired && (!p.actions || p.actions.length === 0)) fail('Regulatory action is required – add at least one action item.');
  if (p.clientRequired) {
    requireText(p.clientName, 'Enter the client name.');
    if (!p.clientOwnerId) fail('Assign the employee responsible for obtaining client approval.');
  }
  r.actions = r.actions.filter((a) => !(a.sourceKey === 'regulatory' && a.status === 'Planned' && a.kind !== 'client'));
  (p.actions || []).forEach((x) => newAction(r, ctx, { ...x, source: 'Regulatory Affairs', sourceKey: 'regulatory' }));
  const existingClient = r.actions.find((a) => a.kind === 'client');
  if (p.clientRequired && existingClient) {
    existingClient.ownerId = p.clientOwnerId;
  } else if (p.clientRequired) {
    newAction(r, ctx, {
      source: 'Regulatory Affairs',
      sourceKey: 'regulatory',
      kind: 'client',
      description: `Obtain client approval from ${p.clientName} and upload the signed approval evidence.`,
      ownerId: p.clientOwnerId,
      due: p.clientDue || isoDate(addDays(ctx.now, 30)),
    });
  }
  r.reg = {
    andaStatus: p.andaStatus, applicable: p.applicable, reporting: p.reporting || [], reference: p.reference || '', comments: p.comments || '',
    regActionRequired: p.regActionRequired, clientRequired: p.clientRequired, clientName: p.clientName || '',
    clientEvidence: r.reg?.clientEvidence || null, completedBy: ctx.user.name, completedAt: ctx.now.toISOString(), clarification: r.reg?.clarification || null,
  };
  r.status = S.CONSOL;
  log(r, ctx, 'Regulatory assessment completed', `Regulatory action: ${p.regActionRequired ? 'Yes' : 'No'} · Client approval: ${p.clientRequired ? 'Yes – ' + p.clientName : 'No'}`, 'Regulatory review');
  return r;
}
export function respondRegClarification(rec, ctx, text) {
  if (!perms(rec, ctx).regRespond) fail('No regulatory clarification is waiting for you.');
  requireText(text, 'Enter your response.');
  const r = clone(rec);
  r.reg.clarification.a = text;
  r.reg.clarification.answeredAt = ctx.now.toISOString();
  log(r, ctx, 'Regulatory clarification answered', text);
  return r;
}
export function uploadClientEvidence(rec, ctx, { fileName, reviewedBy, reviewDate, comment }) {
  const act = rec.actions.find((a) => a.kind === 'client');
  if (!act || !canWorkOnAction(rec, act, ctx)) fail('Only the employee assigned to client approval can upload the evidence.');
  requireText(fileName, 'Choose the signed client approval file.');
  requireText(reviewedBy, 'Enter the client reviewer name.');
  const r = clone(rec);
  r.reg.clientEvidence = { fileName, reviewedBy, reviewDate: reviewDate || isoDate(ctx.now), comment: comment || '', by: ctx.user.name, at: ctx.now.toISOString() };
  r.attachments.push({ id: uid('att'), name: fileName, kind: 'Client approval', by: ctx.user.name, at: ctx.now.toISOString() });
  const a = r.actions.find((x) => x.kind === 'client');
  a.status = 'Completed';
  a.comment = `Signed approval received from ${reviewedBy}. ${comment || ''}`.trim();
  a.evidence.push(fileName);
  log(r, ctx, 'Client approval evidence uploaded', `${fileName} · reviewed by ${reviewedBy} (${r.reg.clientName})`);
  return r;
}

// ------------------------------------------------------------------ action items (consolidation, QA, amendments)
export function addAction(rec, ctx, p) {
  if (!perms(rec, ctx).manageActions) fail('You cannot add action items at this stage.');
  const r = clone(rec);
  const source = perms(rec, ctx).isInitiator ? 'Initiator' : 'QA';
  newAction(r, ctx, { ...p, source: p.source || source });
  return r;
}
export function reassignAction(rec, ctx, actionId, newOwnerId, reason) {
  const p = perms(rec, ctx);
  if (!p.manageActions) fail('You cannot reassign action items at this stage.');
  if (!newOwnerId) fail('Select the new owner.');
  const r = clone(rec);
  const a = r.actions.find((x) => x.id === actionId);
  const old = userById(a.ownerId)?.name;
  a.ownerId = newOwnerId;
  log(r, ctx, 'Action reassigned', `${a.id}: ${old} → ${userById(newOwnerId)?.name}${reason ? ' · ' + reason : ''}`);
  return r;
}

// ------------------------------------------------------------------ Stage 5: consolidation by initiator
export function consolidate(rec, ctx, { decision, returnTarget, note }) {
  if (!perms(rec, ctx).consolidate) fail('Only the initiator can consolidate.');
  const r = clone(rec);
  if (decision === 'submit') {
    if (r.actions.length === 0) fail('The consolidated list has no action items. Add at least one before submitting.');
    r.consolidation = { confirmedAt: ctx.now.toISOString(), by: ctx.user.name };
    r.status = S.QA_APPROVAL;
    log(r, ctx, 'Consolidated impact assessment accepted and submitted to QA', `${r.actions.length} action items in the plan. Implementation remains prohibited until QA approval.`, 'Consolidation accepted');
  } else if (decision === 'return') {
    requireText(note, 'Explain what needs correction.');
    if (returnTarget === 'regulatory') {
      r.status = S.REG;
      r.reg = { ...r.reg, returnNote: note };
      log(r, ctx, 'Returned to Regulatory Affairs for correction', note);
    } else {
      const a = r.assessments.find((x) => x.key === returnTarget);
      if (!a) fail('Select the assessment to return.');
      a.status = 'Pending';
      a.clarifications.push({ q: `Returned by initiator at consolidation: ${note}`, by: ctx.user.name, at: ctx.now.toISOString(), a: 'Awaiting reviewer update.', answeredAt: ctx.now.toISOString() });
      r.status = S.ASSESS;
      log(r, ctx, `${ASSESSMENT_BY_KEY[returnTarget].shortName}: returned for correction`, `${note} Other completed assessments remain valid.`);
    }
  } else fail('Choose Accept & Submit to QA, or Return for Correction.');
  return r;
}

// ------------------------------------------------------------------ Stage 6: QA final risk assessment & approval
export function approvalBlockers(r, settings) {
  const b = [];
  if (r.reg?.clientRequired && !r.reg.clientEvidence && settings.clientGate === 'before_approval') {
    b.push('Client approval is required and the signed evidence has not been uploaded yet (gate: before QA approval).');
  }
  return b;
}
export function qaApprove(rec, ctx, p) {
  if (!perms(rec, ctx).approve) fail('Only the Head of QA (not the initiator) can approve.');
  const r = clone(rec);
  if (p.decision === 'return') {
    requireText(p.comments, 'A comment is required when returning for correction.');
    r.status = S.RETURNED;
    r.returnStage = 6;
    r.returnNote = { by: ctx.user.name, comment: p.comments, at: ctx.now.toISOString(), from: 'QA Approval' };
    log(r, ctx, 'Returned for correction by QA', p.comments);
    return r;
  }
  if (p.decision === 'reject') {
    requireText(p.comments, 'Justification is mandatory when rejecting.');
    r.status = S.REJECTED;
    r.stoppedStage = 6;
    r.risk = { answers: p.answers || {}, otherRisks: p.otherRisks || '', comments: p.comments };
    log(r, ctx, 'Rejected by QA', p.comments, 'Final rejection');
    return r;
  }
  if (p.decision !== 'approve') fail('Choose Approve, Return for Correction or Reject.');
  RISK_QUESTIONS.forEach((q) => {
    if (!p.answers?.[q.id]) fail(`Answer the risk question: "${q.label}"`);
  });
  if (p.answers.q2a === 'Yes') requireText(p.otherRisks, 'Describe the other potential risks.');
  const blockers = approvalBlockers(r, ctx.settings);
  if (blockers.length) fail(blockers[0]);
  if (!p.dueDate) fail('Select the overall Change Control due date.');
  const latest = latestActionDue(r, ctx.now);
  if (latest && p.dueDate < latest) fail(`The overall due date cannot be earlier than the latest action due date (${latest}).`);
  r.risk = { answers: p.answers, otherRisks: p.otherRisks || '', comments: p.comments || '', approvedBy: ctx.user.name };
  r.approvedAt = ctx.now.toISOString();
  r.dueDate = p.dueDate;
  r.dueHistory = [{ date: p.dueDate, at: ctx.now.toISOString(), reason: 'QA final approval' }];
  r.actions.forEach((a) => {
    if (a.status === 'Planned') a.status = 'Not Started';
    if (!a.due && a.durationDays) a.due = isoDate(addDays(ctx.now, a.durationDays));
  });
  r.status = S.IMPL;
  log(r, ctx, 'Approved by QA – implementation authorized', `Overall due date ${p.dueDate}. ${r.actions.length} action items released to their owners.`, 'Final approval');
  return r;
}

// ------------------------------------------------------------------ Stage 7: implementation & action tracking
export function updateAction(rec, ctx, actionId, { status, comment, evidenceName }) {
  const a0 = rec.actions.find((a) => a.id === actionId);
  if (!a0 || !canWorkOnAction(rec, a0, ctx)) fail('Only the assigned owner can update this action, and only after QA approval.');
  const r = clone(rec);
  const a = r.actions.find((x) => x.id === actionId);
  if (status === 'Completed') requireText(comment || a.comment, 'A completion comment is mandatory.');
  if (comment) a.comment = comment;
  if (evidenceName) {
    a.evidence.push(evidenceName);
    r.attachments.push({ id: uid('att'), name: evidenceName, kind: 'Action evidence', by: ctx.user.name, at: ctx.now.toISOString(), actionId });
  }
  if (status && status !== a.status) {
    const from = a.status;
    a.status = status;
    log(r, ctx, `Action ${a.id}: ${from} → ${status}`, comment || '');
  } else if (evidenceName) {
    log(r, ctx, `Action ${a.id}: evidence uploaded`, evidenceName);
  }
  return r;
}
export function returnAction(rec, ctx, actionId, reason) {
  if (!perms(rec, ctx).isInitiator || rec.status !== S.IMPL) fail('Only the initiator can return an action.');
  requireText(reason, 'Explain what is incomplete.');
  const r = clone(rec);
  const a = r.actions.find((x) => x.id === actionId);
  a.status = 'In Progress';
  a.returned = reason;
  log(r, ctx, `Action ${a.id}: returned to owner`, reason);
  return r;
}
export function verify(rec, ctx, { sopNumber }) {
  if (!perms(rec, ctx).verify) fail('All action items must be completed, and any pending amendment decided, before verification.');
  const r = clone(rec);
  if (r.type === 'SOP') requireText(sopNumber, 'Enter the QAD-approved SOP number/version (SOP changes need the approved SOP before verification).');
  r.sopNumber = sopNumber || r.sopNumber;
  r.verifiedAt = ctx.now.toISOString();
  r.status = S.CLOSEOUT;
  log(r, ctx, 'Initiator verified implementation and submitted for QA closeout', `${r.actions.length} actions reviewed with evidence.` + (r.sopNumber ? ` Approved SOP: ${r.sopNumber}.` : ''), 'Implementation verified');
  return r;
}

// ---- extension (SOP 5.11) ----
export function requestExtension(rec, ctx, { reason }) {
  if (!perms(rec, ctx).requestExtension) fail('Only the initiator can request an extension while implementation is in progress.');
  requireText(reason, 'A written reason/justification for the extra time is required.');
  if (rec.extensions.some((e) => ['Pending'].includes(e.status))) fail('An extension request is already pending.');
  const level = rec.extensions.filter((e) => e.status === 'Approved').length + 1;
  const lv = EXTENSION_LEVELS[level - 1];
  if (!lv) fail('The maximum number of extensions has been reached.');
  const deadline = addBusinessDays(ctx.now, 1);
  if (new Date(rec.dueDate + 'T23:59:59Z') < deadline) fail('Extension requests must be submitted at least one business day before the due date.');
  const r = clone(rec);
  r.extensions.push({
    id: `EXT-${r.extensions.length + 1}`, level, days: lv.days, reason, requestedBy: ctx.user.name, requestedAt: ctx.now.toISOString(),
    status: 'Pending', step: 0, chain: lv.chain.map((c) => ({ ...c, done: false })), decisions: [],
  });
  log(r, ctx, `Extension requested – ${lv.label}`, reason, 'Extension request');
  return r;
}
export function extensionActor(rec, ext, ctx) {
  if (ext.status !== 'Pending') return false;
  const step = ext.chain[ext.step];
  if (!step) return false;
  if (step.role === 'dept_head') return ctx.eff.includes(DEPT_HEAD[rec.department]);
  return hasRole(ctx, step.role) && !ctx.eff.includes(rec.initiatorId);
}
export function decideExtension(rec, ctx, extId, { decision, comment }) {
  const ext0 = rec.extensions.find((e) => e.id === extId);
  if (!ext0 || !extensionActor(rec, ext0, ctx)) fail('This extension step is not assigned to you.');
  const r = clone(rec);
  const ext = r.extensions.find((e) => e.id === extId);
  const step = ext.chain[ext.step];
  if (decision === 'reject') {
    requireText(comment, 'A reason is required when rejecting.');
    ext.status = 'Rejected';
    ext.decisions.push({ by: ctx.user.name, label: step.label, type: step.type, decision: 'Rejected', comment, at: ctx.now.toISOString() });
    log(r, ctx, `Extension ${ext.id} rejected (${step.label})`, comment, 'Extension decision');
    return r;
  }
  step.done = true;
  ext.decisions.push({ by: ctx.user.name, label: step.label, type: step.type, decision: step.type === 'review' ? 'Reviewed' : 'Approved', comment: comment || '', at: ctx.now.toISOString() });
  if (ext.step + 1 >= ext.chain.length) {
    ext.status = 'Approved';
    const prev = r.dueDate;
    r.dueDate = isoDate(addDays(prev, ext.days));
    r.dueHistory.push({ date: r.dueDate, at: ctx.now.toISOString(), reason: `${ext.id} approved (+${ext.days} days)` });
    log(r, ctx, `Extension ${ext.id} approved – due date ${prev} → ${r.dueDate}`, comment || '', 'Extension approval');
  } else {
    ext.step += 1;
    log(r, ctx, `Extension ${ext.id}: ${step.type === 'review' ? 'reviewed' : 'approved'} by ${step.label}`, `Next: ${ext.chain[ext.step].label}`, 'Extension review');
  }
  return r;
}

// ---- amendment (Master Workflow Stage 7) ----
export function requestAmendment(rec, ctx, p) {
  if (!perms(rec, ctx).requestAmendment) fail('Only the initiator can request an amendment while implementation is in progress.');
  requireText(p.description, 'Describe the additional action required.');
  requireText(p.reason, 'Explain why it was not identified earlier.');
  if (!p.ownerId) fail('Select the proposed action owner.');
  if (!p.due) fail('Select the proposed due date.');
  const r = clone(rec);
  r.amendments.push({ id: `AMD-${r.amendments.length + 1}`, description: p.description, reason: p.reason, ownerId: p.ownerId, due: p.due, status: 'Pending', requestedBy: ctx.user.name, requestedAt: ctx.now.toISOString() });
  log(r, ctx, 'Amendment requested', `${p.description} — ${p.reason}`);
  return r;
}
export function decideAmendment(rec, ctx, amdId, { decision, comment }) {
  if (!perms(rec, ctx).decideAmendment) fail('Only QA can authorize an amendment.');
  const r = clone(rec);
  const am = r.amendments.find((x) => x.id === amdId);
  if (decision === 'authorize') {
    am.status = 'Authorized';
    am.decidedBy = ctx.user.name;
    am.decidedAt = ctx.now.toISOString();
    am.comment = comment || '';
    newAction(r, ctx, { source: 'Amendment', sourceKey: 'amendment', description: am.description, ownerId: am.ownerId, due: am.due });
    if (am.due > r.dueDate) log(r, ctx, 'Note', 'Action due date is later than the overall due date – an extension is required.');
    log(r, ctx, `Amendment ${am.id} authorized by QA`, comment || '', 'Amendment authorization');
  } else if (decision === 'reject') {
    requireText(comment, 'A reason is required when declining.');
    am.status = 'Declined';
    am.decidedBy = ctx.user.name;
    am.decidedAt = ctx.now.toISOString();
    am.comment = comment;
    log(r, ctx, `Amendment ${am.id} declined by QA`, comment, 'Amendment decision');
  } else fail('Choose Authorize or Decline.');
  return r;
}

// ------------------------------------------------------------------ Stage 8: QA closeout
export function closeoutChecks(r) {
  const acts = r.actions.filter((a) => a.status !== 'Cancelled');
  const done = acts.filter((a) => a.status === 'Completed');
  const evid = r.attachments.filter((a) => a.kind === 'Action evidence' || a.kind === 'Client approval').length;
  const trainingOk = acts.filter((a) => a.source === 'Training').every((a) => a.status === 'Completed');
  return [
    { label: 'All required action items are completed', ok: done.length === acts.length, detail: `${done.length} of ${acts.length} completed` },
    { label: 'Supporting evidence is attached', ok: evid > 0 || acts.length === 0, detail: `${evid} evidence file(s) on record` },
    { label: 'Required technical documentation is approved', ok: r.type !== 'SOP' || !!r.sopNumber, detail: r.type === 'SOP' ? (r.sopNumber ? `Approved SOP: ${r.sopNumber}` : 'Approved SOP number missing') : 'Verified by initiator on submission' },
    { label: 'Applicable training is completed', ok: trainingOk, detail: trainingOk ? 'No open training actions' : 'Training actions still open' },
    { label: 'Regulatory and client requirements are satisfied', ok: !!r.reg && (!r.reg.clientRequired || !!r.reg.clientEvidence), detail: r.reg?.clientRequired ? (r.reg.clientEvidence ? 'Signed client approval on file' : 'Client approval evidence missing') : 'No client approval required' },
  ];
}
export function suggestCloseout(r) {
  const acts = r.actions.filter((a) => a.status !== 'Cancelled');
  const allAssessed = r.assessments.every((a) => ['Accepted', 'Accepted with Action'].includes(a.status));
  return {
    c1: allAssessed ? 'Yes' : '',
    c2: acts.every((a) => a.status === 'Completed') ? 'Yes' : 'No',
    c3: allAssessed ? 'Yes' : '',
    c7: r.extensions.some((e) => e.status === 'Approved') ? 'Yes' : 'No',
    c8: acts.filter((a) => a.source === 'Training').length ? (acts.filter((a) => a.source === 'Training').every((a) => a.status === 'Completed') ? 'Yes' : 'No') : '',
  };
}
export function closeout(rec, ctx, p) {
  const pm = perms(rec, ctx);
  if (p.decision === 'cancel') {
    if (!pm.cancel) fail('Only the Head of QAD (or designee) can cancel/void a Change Control.');
    requireText(p.cancelReason, 'Document the justification for cancelling.');
    const r = clone(rec);
    r.status = S.CANCELLED;
    r.stoppedStage = stageOf(rec);
    r.closeout = { answers: p.answers || {}, disposition: 'Change Request canceled – no action is taken', cancelReason: p.cancelReason, by: ctx.user.name, at: ctx.now.toISOString() };
    log(r, ctx, 'Change Control cancelled / voided', p.cancelReason, 'Cancellation');
    return r;
  }
  if (!pm.closeout) fail('Only QA (not the initiator) can close out this Change Control.');
  const r = clone(rec);
  if (p.decision === 'return') {
    requireText(p.comment, 'A comment is required when returning for correction.');
    r.status = S.RETURNED;
    r.returnStage = 8;
    r.returnNote = { by: ctx.user.name, comment: p.comment, at: ctx.now.toISOString(), from: 'QA Closeout' };
    log(r, ctx, 'Closeout returned for correction', `${p.comment} (same CC number retained)`);
    return r;
  }
  if (p.decision !== 'close') fail('Choose Close, Return for Correction or Cancel / Void.');
  const bad = closeoutChecks(r).find((c) => !c.ok);
  if (bad) fail(`Cannot close: ${bad.label} – ${bad.detail}.`);
  CLOSEOUT_QUESTIONS.forEach((q) => {
    if (q.dependsOn && p.answers?.[q.dependsOn.field] !== q.dependsOn.value) return;
    if (!p.answers?.[q.id]) fail(`Answer closeout question: "${q.label}"`);
  });
  r.closeout = { answers: p.answers, disposition: 'The change was implemented, and the request is considered closed', by: ctx.user.name, at: ctx.now.toISOString(), comment: p.comment || '' };
  r.status = S.CLOSED;
  r.closedAt = ctx.now.toISOString();
  r.archiveRef = `DCR-${r.ccNumber}`;
  log(r, ctx, 'Change Control closed and archived', `Record is now read-only. Archive reference ${r.archiveRef}.`, 'Closure');
  return r;
}

// ------------------------------------------------------------------ tasks & status text for dashboards
export function tasksFor(records, ctx) {
  const out = [];
  records.forEach((r) => {
    const p = perms(r, ctx);
    const add = (title, detail, urgency) => out.push({ rec: r, title, detail: detail || '', urgency: urgency || 'normal' });
    if (p.edit) add(r.status === S.RETURNED ? 'Correct and resubmit' : 'Complete and submit draft', r.returnNote?.comment);
    if (p.endorse) add('Endorse, return or reject', 'Department Head endorsement');
    if (p.screen) add('Screen request and issue CC number', 'QA screening');
    p.assessKeys.forEach((k) => add(`Complete ${ASSESSMENT_BY_KEY[k].shortName} assessment`, 'Departmental assessment'));
    p.respondKeys.forEach((k) => add(`Answer clarification – ${ASSESSMENT_BY_KEY[k].shortName}`, r.assessments.find((a) => a.key === k).clarifications.slice(-1)[0]?.q));
    p.resolveKeys.forEach((k) => add(`Resolve Not Acceptable – ${ASSESSMENT_BY_KEY[k].shortName}`, r.assessments.find((a) => a.key === k).justification));
    if (p.regulatory) add('Complete regulatory assessment', 'Regulatory Affairs');
    if (p.regRespond) add('Answer regulatory clarification', r.reg.clarification.q);
    if (p.consolidate) add('Review consolidated action list', 'Impact consolidation');
    if (p.approve) add('Risk assessment and final approval', 'QA approval');
    if (p.closeout) add('Closeout verification', 'QA closeout');
    if (p.verify) add('Verify implementation and submit to QA', 'All actions completed');
    r.actions.forEach((a) => {
      if (canWorkOnAction(r, a, ctx) && a.status !== 'Completed') add(`${a.id} · ${a.description}`, `Action item · due ${a.due || 'TBD'}`, isOverdue(a, ctx.now) ? 'overdue' : 'normal');
    });
    r.extensions.forEach((e) => {
      if (extensionActor(r, e, ctx)) add(`Extension ${e.id}: ${e.chain[e.step].type === 'review' ? 'review' : 'approve'}`, e.reason);
    });
    if (p.decideAmendment) r.amendments.filter((a) => a.status === 'Pending').forEach((a) => add(`Amendment ${a.id}: authorize or decline`, a.description));
  });
  return out;
}

export function waitingOn(r) {
  switch (r.status) {
    case S.DRAFT: return 'Initiator to complete and submit';
    case S.RETURNED: return `Initiator to correct – returned by ${r.returnNote?.from || 'reviewer'}`;
    case S.PEND_ENDORSE: return `Department Head – ${deptHead(r)?.name}`;
    case S.PEND_SCREEN: return 'QA Designee (screening)';
    case S.ASSESS: {
      const pend = r.assessments.filter((a) => !['Accepted', 'Accepted with Action'].includes(a.status));
      return `${pend.length} assessment(s) open: ${pend.map((a) => ASSESSMENT_BY_KEY[a.key].shortName).join(', ')}`;
    }
    case S.REG: return r.reg?.clarification && !r.reg.clarification.a ? 'Initiator – regulatory clarification' : 'Regulatory Affairs';
    case S.CONSOL: return 'Initiator (consolidation review)';
    case S.QA_APPROVAL: return 'Head of QA (final approval)';
    case S.IMPL: {
      const open = r.actions.filter((a) => !['Completed', 'Cancelled'].includes(a.status));
      return open.length ? `${open.length} action item(s) open` : 'Initiator – verification';
    }
    case S.CLOSEOUT: return 'QA Designee (closeout)';
    default: return '';
  }
}
