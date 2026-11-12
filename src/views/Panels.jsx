import React, { useState } from 'react';
import { CheckCircle2, Undo2, XCircle, ShieldCheck, Clock, Lock, AlertTriangle, Send, Plus } from 'lucide-react';
import * as E from '../engine.js';
import { Button, Card, Banner, Field, Input, TextArea, Select, Seg, FilePicker, FileChip, Badge } from '../ui.jsx';
import { ASSESSMENT_BY_KEY, RISK_QUESTIONS, CLOSEOUT_QUESTIONS, STATUS as S, YNNA } from '../data/forms.js';
import { userById, EMPLOYEES } from '../data/people.js';
import { AssessmentForm, RegulatoryForm, ActionEditor, blankAction, cleanActions } from './Forms.jsx';
import { fmtDate } from '../util.js';

const Panel = ({ title, sub, tone = '', children, right }) => (
  <div className={`card action-panel ${tone}`}>
    <div className="card-h"><div><h2>{title}</h2>{sub && <div className="muted small">{sub}</div>}</div>{right}</div>
    <div className="card-b col" style={{ gap: 14 }}>{children}</div>
  </div>
);

// ---------- Stage 1: Department Head ----------
function DeptHeadPanel({ rec, perform }) {
  const [c, setC] = useState('');
  const go = (decision, sign, label) => perform(rec, E.endorse, [{ decision, comment: c }], { sign, summary: `${label} ${rec.draftId}`, success: label + ' – done' });
  return (
    <Panel title="Your action: review and decide" sub="Stage 1 · Department Head endorsement">
      <Banner tone="info" icon={ShieldCheck}>Endorsement forwards the request to QA screening. <b>It does not authorize implementation.</b></Banner>
      <Field label="Comment" help="Mandatory for Return for Correction and Reject."><TextArea value={c} onChange={(e) => setC(e.target.value)} /></Field>
      <div className="row wrap">
        <Button variant="primary" icon={CheckCircle2} onClick={() => go('endorse', 'Endorsement', 'Endorsed')}>Endorse</Button>
        <Button icon={Undo2} onClick={() => go('return', null, 'Returned for correction')}>Return for Correction</Button>
        <Button variant="danger" icon={XCircle} onClick={() => go('reject', 'Rejection', 'Rejected')}>Reject</Button>
      </div>
    </Panel>
  );
}

// ---------- Stage 2: QA screening ----------
function ScreeningPanel({ rec, perform, records }) {
  const [checks, setChecks] = useState({ complete: false, justified: false, noDuplicate: false });
  const [remarks, setRemarks] = useState('');
  const [comment, setComment] = useState('');
  const [searched, setSearched] = useState(false);
  const words = rec.title.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const similar = records.filter((r) => r.id !== rec.id && r.status !== S.DRAFT && words.some((w) => r.title.toLowerCase().includes(w)) && (r.type === rec.type || r.currentDoc === rec.currentDoc)).slice(0, 4);
  const Chk = ({ k, label }) => <label className={`chk ${checks[k] ? 'on' : ''}`}><input type="checkbox" checked={checks[k]} onChange={(e) => setChecks({ ...checks, [k]: e.target.checked })} />{label}</label>;
  return (
    <Panel title="Your action: QA screening" sub="Stage 2 · verify, then issue the official CC number">
      <div className="lbl">Screening checklist</div>
      <div className="row wrap"><Chk k="complete" label="Request is complete" /><Chk k="justified" label="Justification is adequate" /><Chk k="noDuplicate" label="No duplicate Change Control" /></div>
      <div className="row"><Button sm onClick={() => setSearched(true)}>Search for possible duplicates</Button>{searched && <span className="small muted">{similar.length ? `${similar.length} possible match(es) found` : 'No similar Change Controls found'}</span>}</div>
      {searched && similar.map((s) => <Banner key={s.id} tone="warn" icon={AlertTriangle}><b>{s.ccNumber || s.draftId}</b> – {s.title} <span className="muted">({s.status})</span></Banner>)}
      <Field label="Remarks (if any)"><TextArea style={{ minHeight: 56 }} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Field>
      <Field label="Comment (mandatory for Return / Reject)"><Input value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      <div className="row wrap">
        <Button variant="primary" icon={CheckCircle2} onClick={() => perform(rec, E.screen, [{ decision: 'accept', checks, remarks }], { sign: 'Screening acceptance and number issuance', summary: `Accept ${rec.draftId} and issue the official CC number`, success: 'Accepted – CC number issued' })}>Accept &amp; issue CC number</Button>
        <Button icon={Undo2} onClick={() => perform(rec, E.screen, [{ decision: 'return', comment }], { success: 'Returned to initiator' })}>Return for Correction</Button>
        <Button variant="danger" icon={XCircle} onClick={() => perform(rec, E.screen, [{ decision: 'reject', comment }], { sign: 'Rejection', summary: `Reject ${rec.draftId}`, success: 'Rejected' })}>Reject</Button>
      </div>
    </Panel>
  );
}

// ---------- Stage 3: department assessments (only the user's own checklist) ----------
function AssessmentPanel({ rec, keys, perform, ctx, onBehalf }) {
  const [k, setK] = useState(keys[0]);
  const key = keys.includes(k) ? k : keys[0];
  const def = ASSESSMENT_BY_KEY[key];
  const a = rec.assessments.find((x) => x.key === key);
  return (
    <Panel title={`Your action: complete the ${def.shortName === 'QAD Assessment' ? 'QAD' : def.shortName} assessment`} sub="Stage 3 · parallel departmental assessment – only your department's checklist is shown">
      {keys.length > 1 && <div className="row">{keys.map((x) => <Button key={x} sm variant={x === key ? 'primary' : ''} onClick={() => setK(x)}>{ASSESSMENT_BY_KEY[x].shortName}</Button>)}</div>}
      <AssessmentForm key={key} def={def} assessment={a} actingFor={onBehalf(rec, key)}
        onSubmit={(p) => perform(rec, E.assess, [key, p], { key, sign: p.decision === 'clarify' ? null : 'Assessment decision', summary: `${def.shortName}: ${p.decision}`, success: p.decision === 'clarify' ? 'Clarification request sent' : 'Assessment submitted' })} />
    </Panel>
  );
}
function ClarifyPanel({ rec, keys, perform }) {
  const [t, setT] = useState('');
  const key = keys[0];
  const a = rec.assessments.find((x) => x.key === key);
  const c = a.clarifications[a.clarifications.length - 1];
  return (
    <Panel title={`Your action: answer clarification – ${ASSESSMENT_BY_KEY[key].shortName}`} sub="Only this assessment is paused; the others continue">
      <Banner tone="warn"><b>{c.by} asks:</b> {c.q}</Banner>
      <Field label="Your response" req><TextArea value={t} onChange={(e) => setT(e.target.value)} /></Field>
      <div><Button variant="primary" icon={Send} onClick={() => perform(rec, E.respondClarification, [key, t], { success: 'Response sent to the reviewer' })}>Send response</Button></div>
    </Panel>
  );
}
function ResolvePanel({ rec, keys, perform }) {
  const key = keys[0];
  const a = rec.assessments.find((x) => x.key === key);
  const [o, setO] = useState('reassess');
  const [n, setN] = useState('');
  return (
    <Panel title={`Your action: resolve Not Acceptable – ${ASSESSMENT_BY_KEY[key].shortName}`} sub="Stage 3 · QA resolution">
      <Banner tone="danger" icon={AlertTriangle}><b>Reviewer justification:</b> {a.justification}</Banner>
      <Field label="Resolution"><Select value={o} onChange={(e) => setO(e.target.value)}><option value="reassess">Send back to the reviewer for reassessment</option><option value="return">Return the Change Control to the initiator</option><option value="reject">Reject the Change Control</option></Select></Field>
      <Field label="QA rationale" req><TextArea value={n} onChange={(e) => setN(e.target.value)} /></Field>
      <div><Button variant="primary" onClick={() => perform(rec, E.resolveNotAcceptable, [key, { outcome: o, note: n }], { sign: 'QA resolution', summary: `Resolve ${ASSESSMENT_BY_KEY[key].shortName}`, success: 'QA resolution recorded' })}>Record resolution</Button></div>
    </Panel>
  );
}

// ---------- Stage 4: Regulatory ----------
function RegPanel({ rec, perform }) {
  return (
    <Panel title="Your action: regulatory assessment" sub="Stage 4 · Regulatory Affairs – regulatory action and client approval requirements">
      <RegulatoryForm rec={rec} onSubmit={(p) => perform(rec, E.regulatory, [p], { sign: p.decision === 'clarify' ? null : 'Regulatory review', summary: 'Complete the regulatory assessment', success: p.decision === 'clarify' ? 'Clarification request sent' : 'Regulatory assessment completed' })} />
    </Panel>
  );
}
function RegRespondPanel({ rec, perform }) {
  const [t, setT] = useState('');
  return (
    <Panel title="Your action: answer regulatory clarification" sub="Stage 4 · Regulatory Affairs">
      <Banner tone="warn"><b>Regulatory Affairs asks:</b> {rec.reg.clarification.q}</Banner>
      <Field label="Your response" req><TextArea value={t} onChange={(e) => setT(e.target.value)} /></Field>
      <div><Button variant="primary" icon={Send} onClick={() => perform(rec, E.respondRegClarification, [t], { success: 'Response sent' })}>Send response</Button></div>
    </Panel>
  );
}
export function ClientEvidencePanel({ rec, perform }) {
  const [f, setF] = useState('');
  const [by, setBy] = useState('');
  const [c, setC] = useState('');
  return (
    <Panel title="Your action: upload signed client approval" sub={`Client: ${rec.reg.clientName} · approval is obtained externally and evidence is uploaded here`}>
      <div className="grid g2">
        <Field label="Client reviewer name" req><Input value={by} onChange={(e) => setBy(e.target.value)} /></Field>
        <Field label="Signed approval document" req>
          <div className="filebox">{f ? <FileChip name={f} /> : <span className="muted">No file selected</span>}<FilePicker label="Choose file" onPick={setF} /></div>
        </Field>
      </div>
      <Field label="Comment"><Input value={c} onChange={(e) => setC(e.target.value)} /></Field>
      <div><Button variant="primary" onClick={() => perform(rec, E.uploadClientEvidence, [{ fileName: f, reviewedBy: by, comment: c }], { success: 'Client approval evidence uploaded' })}>Upload evidence</Button></div>
    </Panel>
  );
}

// ---------- Stage 5: consolidation ----------
export function ActionTable({ rec, ctx, compact }) {
  const rows = rec.actions;
  return (
    <div className="table-wrap">
      <table className="t">
        <thead><tr><th>ID</th><th>Source</th><th>Action</th><th>Owner</th><th>Due</th>{!compact && <th>Status</th>}</tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td className="mono">{a.id}</td><td>{a.source}</td><td>{a.description}</td><td>{userById(a.ownerId)?.name}</td>
              <td>{a.due ? fmtDate(a.due) : `${a.durationDays} days after approval`}</td>
              {!compact && <td><Badge tone={a.status === 'Completed' ? 'green' : a.status === 'In Progress' ? 'orange' : ''}>{a.status}</Badge></td>}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="muted">No action items yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
function ConsolidationPanel({ rec, ctx, perform }) {
  const [rows, setRows] = useState([]);
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [mode, setMode] = useState('');
  const addAll = () => {
    const list = cleanActions(rows);
    if (!list.length) return;
    let cur = rec; let ok = true;
    list.forEach((x) => { if (!ok) return; ok = perform(cur, E.addAction, [x], { silent: true, chain: (n) => { cur = n; } }) !== false; });
    if (ok) setRows([]);
  };
  return (
    <Panel title="Your action: review the consolidated impact assessment" sub="Stage 5 · actions from all departments and Regulatory Affairs are merged automatically">
      <Banner tone="info" icon={Lock}>Implementation remains prohibited until QA final approval.</Banner>
      <ActionTable rec={rec} ctx={ctx} compact />
      <div className="row"><Button sm icon={Plus} onClick={() => setRows([...rows, blankAction()])}>Add a missing action</Button></div>
      {rows.length > 0 && <><ActionEditor rows={rows} onChange={setRows} title="New actions" /><div><Button variant="primary" onClick={addAll}>Save added actions</Button></div></>}
      {mode === 'return' && (
        <div className="grid g2">
          <Field label="Return to" req><Select value={target} onChange={(e) => setTarget(e.target.value)}><option value="">Select…</option>{rec.assessments.map((a) => <option key={a.key} value={a.key}>{ASSESSMENT_BY_KEY[a.key].shortName}</option>)}<option value="regulatory">Regulatory Affairs</option></Select></Field>
          <Field label="What needs correction" req><Input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </div>
      )}
      <div className="row wrap">
        <Button variant="primary" icon={CheckCircle2} onClick={() => perform(rec, E.consolidate, [{ decision: 'submit' }], { sign: 'Consolidation accepted', summary: 'Confirm the action list is complete and submit to QA', success: 'Submitted to QA for final risk review' })}>Accept &amp; submit to QA</Button>
        <Button icon={Undo2} onClick={() => (mode === 'return' ? perform(rec, E.consolidate, [{ decision: 'return', returnTarget: target, note }], { success: 'Returned for correction' }) : setMode('return'))}>{mode === 'return' ? 'Confirm return for correction' : 'Return for Correction'}</Button>
      </div>
    </Panel>
  );
}

// ---------- Stage 6: QA final risk assessment & approval ----------
function ApprovalPanel({ rec, ctx, perform }) {
  const [ans, setAns] = useState({});
  const [other, setOther] = useState('');
  const [comments, setComments] = useState('');
  const [due, setDue] = useState(E.isoDate(E.addDays(new Date(), ctx.settings.defaultDueDays)));
  const [rows, setRows] = useState([]);
  const blockers = E.approvalBlockers(rec, ctx.settings);
  const latest = E.latestActionDue(rec, new Date());
  const addMit = () => {
    const list = cleanActions(rows);
    let cur = rec; let ok = true;
    list.forEach((x) => { if (!ok) return; ok = perform(cur, E.addAction, [{ ...x, source: 'QA' }], { silent: true, chain: (n) => { cur = n; } }) !== false; });
    if (ok) setRows([]);
  };
  let grp = '';
  return (
    <Panel title="Your action: risk assessment and final approval" sub="Stage 6 · QA reviews the complete package, assesses risk and sets the overall due date">
      <div className="grid g2">
        <div className="card pad" style={{ background: '#fafbfd' }}>
          <div className="section-t">Departmental assessments</div>
          {rec.assessments.map((a) => <div key={a.key} className="row between small" style={{ padding: '3px 0' }}><span>{ASSESSMENT_BY_KEY[a.key].shortName}</span><Badge tone="green">{a.status}</Badge></div>)}
        </div>
        <div className="card pad" style={{ background: '#fafbfd' }}>
          <div className="section-t">Regulatory and client</div>
          <div className="small">Regulatory action: <b>{rec.reg?.regActionRequired ? 'Yes' : 'No'}</b></div>
          <div className="small">Client approval: <b>{rec.reg?.clientRequired ? `Required – ${rec.reg.clientName}` : 'Not required'}</b></div>
          {rec.reg?.clientRequired && <div className="small mt-s">{rec.reg.clientEvidence ? <Badge tone="green">Signed evidence on file</Badge> : <Badge tone="red">Evidence missing</Badge>}</div>}
          <div className="small mt-s">Action items in plan: <b>{rec.actions.length}</b> · latest due {fmtDate(latest) || '—'}</div>
        </div>
      </div>
      {blockers.map((b, i) => <Banner key={i} tone="danger" icon={Lock}><b>Approval blocked.</b> {b}</Banner>)}
      <div>
        <div className="lbl">Risk Assessment <span className="muted" style={{ fontWeight: 400 }}>(answer all questions with respect to the change)</span></div>
        {RISK_QUESTIONS.map((q) => {
          const head = q.group !== grp ? ((grp = q.group), <div className="qgroup" key={q.group}>{q.group}</div>) : null;
          return <React.Fragment key={q.id}>{head}<div className="qrow"><span>{q.label}</span><Seg options={YNNA} value={ans[q.id]} onChange={(v) => setAns({ ...ans, [q.id]: v })} /></div></React.Fragment>;
        })}
        {ans.q2a === 'Yes' && <Field label="Describe the other potential risks" req><TextArea value={other} onChange={(e) => setOther(e.target.value)} /></Field>}
      </div>
      <div>
        <div className="lbl">Action Plan <span className="muted" style={{ fontWeight: 400 }}>(additional actions to mitigate the identified risks)</span></div>
        <ActionTable rec={rec} ctx={ctx} compact />
        <div className="row mt-s"><Button sm icon={Plus} onClick={() => setRows([...rows, blankAction()])}>Add mitigation action</Button></div>
        {rows.length > 0 && <div className="mt-s"><ActionEditor rows={rows} onChange={setRows} title="New mitigation actions" /><Button variant="primary" onClick={addMit}>Save mitigation actions</Button></div>}
      </div>
      <div className="grid g2">
        <Field label="Change Control due date" req help={`Normally ${ctx.settings.defaultDueDays} days from approval. Cannot be earlier than the latest action due date${latest ? ' (' + fmtDate(latest) + ')' : ''}. Includes action completion, initiator verification and QA closure.`}><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <Field label="Comments (mandatory for Return / Reject)"><TextArea style={{ minHeight: 60 }} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
      </div>
      <div className="row wrap">
        <Button variant="success" icon={ShieldCheck} disabled={blockers.length > 0} onClick={() => perform(rec, E.qaApprove, [{ decision: 'approve', answers: ans, otherRisks: other, comments, dueDate: due }], { sign: 'Final approval', summary: `Approve ${rec.ccNumber} and authorize implementation`, success: 'Approved – implementation authorized' })}>Approve &amp; authorize implementation</Button>
        <Button icon={Undo2} onClick={() => perform(rec, E.qaApprove, [{ decision: 'return', comments }], { success: 'Returned to initiator' })}>Return for Correction</Button>
        <Button variant="danger" icon={XCircle} onClick={() => perform(rec, E.qaApprove, [{ decision: 'reject', answers: ans, otherRisks: other, comments }], { sign: 'Final rejection', summary: `Reject ${rec.ccNumber}`, success: 'Change Control rejected' })}>Reject</Button>
      </div>
    </Panel>
  );
}

// ---------- Stage 7: verification by initiator ----------
function VerifyPanel({ rec, perform, openExt, openAmd }) {
  const [sop, setSop] = useState(rec.sopNumber || '');
  return (
    <Panel title="Your action: verify implementation" sub="Stage 7 · all action items are completed – review the list and evidence, then submit to QA closeout">
      <Banner tone="success" icon={CheckCircle2}>All {rec.actions.length} action items are marked Completed.</Banner>
      {rec.type === 'SOP' && <Field label="QAD-approved SOP number / version" req help="Required for SOP changes: Section IX is completed only after the new or revised SOP has been approved and signed by QAD."><Input value={sop} onChange={(e) => setSop(e.target.value)} /></Field>}
      <div className="row wrap">
        <Button variant="primary" icon={Send} onClick={() => perform(rec, E.verify, [{ sopNumber: sop }], { sign: 'Implementation completed and verified', summary: `Verify ${rec.ccNumber} and submit for QA closeout`, success: 'Submitted to QA for closeout' })}>Verify &amp; submit to QA</Button>
        <span className="muted small">To send an incomplete action back, open the Actions tab and choose “Return action”.</span>
      </div>
    </Panel>
  );
}
export function ImplementationInfo({ rec, ctx, perm, openExt, openAmd, setTab }) {
  const mine = rec.actions.filter((a) => E.canWorkOnAction(rec, a, ctx) && a.status !== 'Completed');
  const open = rec.actions.filter((a) => !['Completed', 'Cancelled'].includes(a.status)).length;
  const overall = rec.dueDate;
  return (
    <Panel tone={mine.length ? '' : 'wait'} title={mine.length ? `Your action: complete ${mine.length} action item(s)` : 'Implementation in progress'} sub={`Stage 7 · action items run independently · overall due ${fmtDate(overall)}`}
      right={perm.requestExtension && <div className="row"><Button sm onClick={openExt}>Request extension</Button><Button sm onClick={openAmd}>Request amendment</Button></div>}>
      <div className="row between wrap">
        <span>{open} of {rec.actions.length} action items still open.{perm.isInitiator && !perm.allDone && ' The initiator verifies once all are completed.'}</span>
        {mine.length > 0 && <Button variant="primary" onClick={() => setTab('actions')}>Open my action items</Button>}
      </div>
    </Panel>
  );
}

// ---------- Stage 8: QA closeout ----------
function CloseoutPanel({ rec, perm, perform }) {
  const sug = E.suggestCloseout(rec);
  const [ans, setAns] = useState({ ...sug });
  const [comment, setComment] = useState('');
  const [cancel, setCancel] = useState('');
  const checks = E.closeoutChecks(rec);
  const ok = checks.every((c) => c.ok);
  return (
    <Panel title="Your action: QA closeout" sub="Stage 8 · verify, confirm the closeout questions and close the Change Control">
      <div>
        <div className="lbl mb">Verification (system-populated, QA confirms)</div>
        {checks.map((c) => <div key={c.label} className="qrow"><span>{c.label}<div className="help">{c.detail}</div></span><Badge tone={c.ok ? 'green' : 'red'}>{c.ok ? 'Verified' : 'Not met'}</Badge></div>)}
      </div>
      <div>
        <div className="lbl">Closeout questions</div>
        {CLOSEOUT_QUESTIONS.map((q) => (q.dependsOn && ans[q.dependsOn.field] !== q.dependsOn.value ? null : (
          <div className="qrow" key={q.id} style={q.sub ? { paddingLeft: 24 } : undefined}><span>{q.label}</span><Seg options={YNNA} value={ans[q.id]} onChange={(v) => setAns({ ...ans, [q.id]: v })} /></div>
        )))}
      </div>
      <Field label="Final disposition"><div className="chk on" style={{ width: 'fit-content' }}>The change was implemented, and the request is considered closed</div></Field>
      <Field label="Comment (mandatory for Return)"><Input value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
      {perm.cancel && <Field label="If cancelling – explain (Head of QAD only)"><Input value={cancel} onChange={(e) => setCancel(e.target.value)} /></Field>}
      <div className="row wrap">
        <Button variant="success" icon={ShieldCheck} disabled={!ok} onClick={() => perform(rec, E.closeout, [{ decision: 'close', answers: ans, comment }], { sign: 'Closure', summary: `Close ${rec.ccNumber}`, success: 'Change Control closed and archived' })}>Close &amp; archive</Button>
        <Button icon={Undo2} onClick={() => perform(rec, E.closeout, [{ decision: 'return', comment }], { success: 'Returned to initiator (same CC number)' })}>Return for Correction</Button>
        {perm.cancel && <Button variant="danger" icon={XCircle} onClick={() => perform(rec, E.closeout, [{ decision: 'cancel', cancelReason: cancel, answers: ans }], { sign: 'Cancellation', summary: `Cancel / void ${rec.ccNumber}`, success: 'Change Control cancelled' })}>Cancel / Void</Button>}
      </div>
    </Panel>
  );
}
export function CancelOnlyPanel({ rec, perform }) {
  const [cancel, setCancel] = useState('');
  return (
    <Panel tone="wait" title="Cancel / void (Head of QAD)" sub="Only when issues arise during implementation (documented justification required)">
      <Field label="Justification" req><Input value={cancel} onChange={(e) => setCancel(e.target.value)} /></Field>
      <div><Button variant="danger" icon={XCircle} onClick={() => perform(rec, E.closeout, [{ decision: 'cancel', cancelReason: cancel }], { sign: 'Cancellation', summary: `Cancel / void ${rec.ccNumber}`, success: 'Change Control cancelled' })}>Cancel / Void</Button></div>
    </Panel>
  );
}

// ---------- waiting / final banners ----------
export function WaitingPanel({ rec, ctx }) {
  const text = E.waitingOn(rec);
  return (
    <Panel tone="wait" title="Waiting on" sub={`Stage ${E.stageOf(rec)} of 8`}>
      <div className="row"><Clock size={18} className="muted" /><b>{text}</b></div>
      <div className="muted small">You have no action to take on this Change Control at this step. Use the tabs below to review its content and full activity history.</div>
    </Panel>
  );
}
export function FinalPanel({ rec }) {
  if (rec.status === S.CLOSED) return <Panel tone="done" title="Change Control closed" sub="Read-only record"><div>Closed on <b>{fmtDate(rec.closedAt)}</b> by <b>{rec.closeout.by}</b>. Archive reference <b>{rec.archiveRef}</b>. The record remains searchable and retrievable.</div></Panel>;
  const last = rec.history[rec.history.length - 1];
  return <Panel tone="stop" title={`Change Control ${rec.status.toLowerCase()}`} sub="Read-only record"><div>{last?.action}: {last?.detail}</div></Panel>;
}
export function ReturnedNote({ rec }) {
  if (rec.status !== S.RETURNED || !rec.returnNote) return null;
  return <Banner tone="warn" icon={Undo2}><b>Returned for correction by {rec.returnNote.from} ({rec.returnNote.by}):</b> {rec.returnNote.comment}</Banner>;
}

export default function Panels({ rec, ctx, perm, perform, records, onBehalf, openExt, openAmd, setTab, onEdit }) {
  const out = [];
  if (E.isFinal(rec)) return <FinalPanel rec={rec} />;
  if (perm.edit) out.push(<Panel key="edit" title="Your action: complete and submit" sub={rec.status === S.RETURNED ? 'Correct the request and resubmit' : 'Stage 1 · complete Sections I and III, then submit to your Department Head'}><ReturnedNote rec={rec} /><div><Button variant="primary" onClick={onEdit}>{rec.status === S.RETURNED ? 'Edit and resubmit' : 'Continue editing'}</Button></div></Panel>);
  if (perm.endorse) out.push(<DeptHeadPanel key="end" rec={rec} perform={perform} />);
  if (perm.screen) out.push(<ScreeningPanel key="scr" rec={rec} perform={perform} records={records} />);
  if (perm.assessKeys.length) out.push(<AssessmentPanel key="ass" rec={rec} keys={perm.assessKeys} perform={perform} ctx={ctx} onBehalf={onBehalf} />);
  if (perm.respondKeys.length) out.push(<ClarifyPanel key="cl" rec={rec} keys={perm.respondKeys} perform={perform} />);
  if (perm.resolveKeys.length) out.push(<ResolvePanel key="rs" rec={rec} keys={perm.resolveKeys} perform={perform} />);
  if (perm.regulatory) out.push(<RegPanel key="reg" rec={rec} perform={perform} />);
  if (perm.regRespond) out.push(<RegRespondPanel key="rr" rec={rec} perform={perform} />);
  if (perm.consolidate) out.push(<ConsolidationPanel key="con" rec={rec} ctx={ctx} perform={perform} />);
  if (perm.approve) out.push(<ApprovalPanel key="app" rec={rec} ctx={ctx} perform={perform} />);
  if (perm.closeout) out.push(<CloseoutPanel key="clo" rec={rec} perm={perm} perform={perform} />);
  if (perm.verify) out.push(<VerifyPanel key="ver" rec={rec} perform={perform} />);
  const clientAct = rec.actions.find((a) => a.kind === 'client');
  if (clientAct && !rec.reg?.clientEvidence && E.canWorkOnAction(rec, clientAct, ctx)) out.push(<ClientEvidencePanel key="ce" rec={rec} perform={perform} />);
  if (rec.status === S.IMPL) out.push(<ImplementationInfo key="impl" rec={rec} ctx={ctx} perm={perm} openExt={openExt} openAmd={openAmd} setTab={setTab} />);
  if (perm.cancel && rec.status === S.IMPL) out.push(<CancelOnlyPanel key="cx" rec={rec} perform={perform} />);
  if (out.length === 0 || (out.length === 1 && rec.status === S.IMPL && !perm.isInitiator && out[0].key === 'impl' && false)) out.push(<WaitingPanel key="w" rec={rec} ctx={ctx} />);
  return <div className="col" style={{ gap: 16 }}>{out}</div>;
}
