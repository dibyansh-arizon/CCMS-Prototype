import assert from 'node:assert/strict';
import * as E from '../src/engine.js';
import { makeCtx } from '../src/ctx.js';
import { buildSeed } from '../src/seed.js';
import { userById } from '../src/data/people.js';

let pass = 0;
const t = (n, fn) => { try { fn(); pass++; console.log('  ok  ', n); } catch (e) { console.error('  FAIL', n, '\n      ', e.message); process.exitCode = 1; } };
const wf = (fn, re) => assert.throws(fn, (e) => e instanceof E.WorkflowError && (!re || re.test(e.message)));
const seed = buildSeed(new Date());
const st = { counters: seed.counters, settings: seed.settings };
const C = (uid) => makeCtx(userById(uid), { ...st, now: new Date() });
const find = (pred) => seed.records.find(pred);
const ROWS = [{ sno: 1, current: 'a', proposed: 'b', justification: 'c' }];
const ANS = { validation: { process: 'No', cleaning: 'No', equipment: 'No' }, analytical: { method: 'No', equipment: 'No' }, stability: { required: 'No' }, computer: { validation: 'No' }, safety: { operator: 'No', environment: 'No' }, training: { departments: ['OPS'], trainingType: 'Read and Understand' }, qad: { stabilityProtocol: 'No', vendor: 'No', qualityAgreement: 'No' } };
const WHO = { validation: 'u_rajesh', analytical: 'u_saurabh', stability: 'u_meenal', computer: 'u_vivek', safety: 'u_kavita', training: 'u_vikram', qad: 'u_neha' };
const fut = (n) => E.isoDate(E.addDays(new Date(), n));

console.log('Roles, navigation scope and access');
t('role model: Employee, HOD, RA Designee, QA Designee, CEO, System Admin; multi-role account', () => { assert.deepEqual(userById('u_meera').roles, ['hod', 'ra_designee']); assert.ok(userById('u_priya').roles.includes('qa_designee')); assert.ok(userById('u_karuna').roles.includes('ceo')); });
t('System Admin cannot open Change Control records', () => seed.records.forEach((r) => assert.equal(E.canViewRecord(r, userById('u_rohit')), false)));
t('employee sees only own / assigned records', () => { const v = seed.records.filter((r) => E.canViewRecord(r, userById('u_karan'))); assert.ok(v.length < seed.records.length); assert.ok(v.every((r) => r.initiatorId === 'u_karan' || r.actions.some((a) => a.ownerId === 'u_karan'))); });
t('QA Designee and CEO see all', () => { assert.equal(seed.records.filter((r) => E.canViewRecord(r, userById('u_priya'))).length, seed.records.length); assert.equal(seed.records.filter((r) => E.canViewRecord(r, userById('u_karuna'))).length, seed.records.length); });
t('CEO has no workflow permissions (read-only)', () => seed.records.forEach((r) => { const p = E.perms(r, C('u_karuna')); assert.ok(!p.edit && !p.approve && !p.screen && !p.closeout && !p.endorse); }));

console.log('Change table and creation');
t('change table must be complete (four columns per row)', () => { const r = E.createDraft(C('u_ananya'), { title: 'x', type: 'SOP', changes: [{ sno: 1, current: 'a', proposed: '', justification: 'c' }] }); wf(() => E.submit(r, C('u_ananya')), /Change row 1/); });

console.log('Restart-review rule (clarification / correction)');
let r = E.createDraft(C('u_ananya'), { title: 'Round test', type: 'SOP', changes: ROWS });
r = E.submit(r, C('u_ananya')); r = E.endorse(r, C('u_vikram'), { decision: 'endorse' });
r = E.screen(r, C('u_priya'), { decision: 'accept', checks: { complete: true, justified: true, noDuplicate: true } });
t('QA Designee screens and issues CC number; 7 assessments go to HODs', () => { assert.match(r.ccNumber, /^CC\d{5}$/); assert.equal(r.assessments.length, 7); });
t('ARD or QCS: either HOD can sign Analytical and Stability (one sign-off)', () => { assert.deepEqual(r.assessments.find((a) => a.key === 'stability').assignees.sort(), ['u_meenal', 'u_saurabh']); });
t('QA HOD only sees the QAD checklist in Stage 3', () => assert.deepEqual(E.perms(r, C('u_neha')).assessKeys, ['qad']));
['validation', 'stability', 'computer', 'safety'].forEach((k) => { r = E.assess(r, C(WHO[k]), k, { decision: 'accept', answers: ANS[k] }); });
r = E.assess(r, C('u_vikram'), 'training', { decision: 'accept_action', answers: ANS.training, actions: [{ description: 'Train', ownerId: 'u_karan', due: fut(10) }] });
r = E.assess(r, C('u_saurabh'), 'analytical', { decision: 'clarify', clarificationText: 'Which method?', answers: ANS.analytical });
t('any clarification returns the CC to the initiator (whole review pauses)', () => { assert.equal(r.status, 'Clarification Requested'); assert.deepEqual(E.perms(r, C('u_neha')).assessKeys, []); assert.equal(E.perms(r, C('u_ananya')).respond, true); });
r = E.respondClarification(r, C('u_ananya'), { text: 'See table', changes: [{ sno: 1, current: 'a2', proposed: 'b2', justification: 'c2' }] });
t('initiator response goes to the initiator’s HOD for re-endorsement (not straight to reviewers)', () => { assert.equal(r.status, 'Pending HOD Re-endorsement'); assert.equal(E.perms(r, C('u_vikram')).endorse, true); assert.equal(r.changes[0].current, 'a2'); });
const before = r.history.length;
r = E.endorse(r, C('u_vikram'), { decision: 'endorse' });
t('re-endorsement reopens ALL assessments (round 2); prior round preserved; same CC number', () => { assert.equal(r.status, 'Departmental Assessment'); assert.equal(r.round, 2); assert.ok(r.assessments.every((a) => a.status === 'Pending' && a.rounds.length === 1)); assert.ok(r.history.length > before); });
t('earlier answers are prefilled for reassessment', () => assert.deepEqual(r.assessments.find((a) => a.key === 'validation').answers, ANS.validation));
r = E.assess(r, C('u_vikram'), 'training', { decision: 'accept_action', answers: ANS.training, actions: [{ description: 'Train v2', ownerId: 'u_karan', due: fut(12) }] });
t('reassessment replaces (not duplicates) that department’s planned actions', () => assert.equal(r.actions.filter((a) => a.sourceKey === 'training').length, 1));

console.log('QA approval (QA Designee)');
['validation', 'stability', 'computer', 'safety', 'qad'].forEach((k) => { r = E.assess(r, C(WHO[k]), k, { decision: 'accept', answers: ANS[k] }); });
r = E.assess(r, C('u_saurabh'), 'analytical', { decision: 'accept', answers: ANS.analytical });
t('RA Designee completes regulatory; client approval timing gate NOT enforced by default', () => { r = E.regulatory(r, C('u_meera'), { andaStatus: 'Not Applicable', applicable: 'Not Applicable', regActionRequired: false, clientRequired: true, clientName: 'Acme', clientOwnerId: 'u_sonal' }); assert.equal(r.status, 'Pending Initiator Consolidation'); });
r = E.consolidate(r, C('u_ananya'), { decision: 'submit' });
t('QA return before approval -> initiator corrects -> HOD re-endorsement -> all HODs reassess again', () => { const ret = E.qaApprove(r, C('u_priya'), { decision: 'return', comments: 'fix' }); const re = E.submit(ret, C('u_ananya')); assert.equal(re.status, 'Pending HOD Re-endorsement'); const e2 = E.endorse(re, C('u_vikram'), { decision: 'endorse' }); assert.equal(e2.round, 3); assert.ok(e2.assessments.every((a) => a.status === 'Pending')); });
t('QA must confirm RA determination review', () => wf(() => E.qaApprove(r, C('u_priya'), { decision: 'approve', answers: { q1a: 'No', q1b: 'No', q1c: 'No', q1d: 'No', q2a: 'No' }, dueDate: fut(60) }), /RA/));
t('only a QA Designee approves (HOD cannot)', () => wf(() => E.qaApprove(r, C('u_neha'), { decision: 'approve' })));
t('due date cannot precede the latest action date', () => wf(() => E.qaApprove(r, C('u_priya'), { decision: 'approve', answers: { q1a: 'No', q1b: 'No', q1c: 'No', q1d: 'No', q2a: 'No' }, dueDate: fut(2), raReviewed: true }), /earlier than the latest/));
r = E.qaApprove(r, C('u_priya'), { decision: 'approve', answers: { q1a: 'No', q1b: 'No', q1c: 'No', q1d: 'No', q2a: 'No' }, dueDate: fut(60), raReviewed: true });
t('approval authorizes implementation', () => assert.equal(r.status, 'Implementation in Progress'));

console.log('Extension rules');
const due0 = r.dueDate;
t('extension asks for additional days and a reason', () => { wf(() => E.requestExtension(r, C('u_ananya'), { days: '', reason: 'x' }), /days/); wf(() => E.requestExtension(r, C('u_ananya'), { days: 10, reason: '' }), /reason/); });
let x = E.requestExtension(r, C('u_ananya'), { days: 15, reason: 'Vendor delay' });
t('1st extension: Initiator’s HOD then QAD HOD (final)', () => { assert.deepEqual(x.extensions[0].chain.map((c) => c.role), ['initiator_hod', 'qad_hod']); wf(() => E.decideExtension(x, C('u_neha'), 'EXT-1', { decision: 'approve' })); });
x = E.decideExtension(x, C('u_vikram'), 'EXT-1', { decision: 'approve', comment: 'ok' });
t('dates do not change until FULL approval', () => { assert.equal(x.dueDate, due0); assert.equal(x.extensions[0].status, 'Pending'); });
t('return / reject need reasons', () => wf(() => E.decideExtension(x, C('u_neha'), 'EXT-1', { decision: 'reject' }), /reason/));
t('QAD HOD may optionally forward to the CEO', () => { const f = E.decideExtension(x, C('u_neha'), 'EXT-1', { decision: 'forward', comment: 'CEO view needed' }); assert.deepEqual(E.extensionActor(f, f.extensions[0], C('u_karuna')), true); });
const act0 = x.actions.find((a) => a.status !== 'Completed').due;
x = E.decideExtension(x, C('u_neha'), 'EXT-1', { decision: 'approve', comment: 'ok' });
t('final approval: overall due date and pending action deadlines move; originals retained', () => { assert.equal(x.dueDate, E.isoDate(E.addDays(due0, 15))); const a = x.actions.find((q) => q.originalDue); assert.equal(a.originalDue, act0); assert.equal(x.dueHistory.length, 2); });
for (let i = 2; i <= 3; i++) { x = E.requestExtension(x, C('u_ananya'), { days: 5, reason: 'again' }); x = E.decideExtension(x, C('u_vikram'), `EXT-${i}`, { decision: 'approve' }); x = E.decideExtension(x, C('u_neha'), `EXT-${i}`, { decision: 'approve' }); }
x = E.requestExtension(x, C('u_ananya'), { days: 5, reason: '4th' });
t('4th extension: QAD HOD must pass to the CEO (mandatory)', () => { assert.deepEqual(x.extensions[3].chain.map((c) => c.role), ['initiator_hod', 'qad_hod', 'ceo']); x = E.decideExtension(x, C('u_vikram'), 'EXT-4', { decision: 'approve' }); x = E.decideExtension(x, C('u_neha'), 'EXT-4', { decision: 'approve', comment: 'to CEO' }); assert.equal(x.extensions[3].status, 'Pending'); assert.equal(E.extensionActor(x, x.extensions[3], C('u_karuna')), true); x = E.decideExtension(x, C('u_karuna'), 'EXT-4', { decision: 'approve' }); assert.equal(E.approvedExtensions(x), 4); });
t('a fifth extension is an open decision – blocked', () => wf(() => E.requestExtension(x, C('u_ananya'), { days: 5, reason: 'fifth' }), /fifth/i));

console.log('Documents & closeout loop');
t('uploads keep every version; previous marked superseded', () => { let d = E.addAttachment(r, C('u_ananya'), { name: 'Protocol_v1.pdf' }); d = E.addAttachment(d, C('u_ananya'), { name: 'Protocol_v2.pdf' }); const p = d.attachments.filter((a) => a.docKey === 'protocol'); assert.equal(p.length, 2); assert.equal(p.filter((a) => a.superseded).length, 1); assert.equal(p[1].version, 2); });
t('final signed documents only during implementation/closeout', () => { wf(() => E.addAttachment(seed.records.find((q) => q.status === 'Pending Department Head Endorsement'), C('u_ananya'), { name: 'f.pdf', kind: 'Final signed document' })); });
const cl = seed.records.find((q) => q.status === 'Pending QA Closeout');
t('QA closeout returns to initiator under the same CC number; initiator resubmits', () => { const ret = E.closeout(cl, C('u_priya'), { decision: 'return', comment: 'check', flagActions: [cl.actions[0].id] }); assert.equal(ret.ccNumber, cl.ccNumber); assert.ok(ret.actions[0].flagged); const re = E.resubmitCloseout(ret, C('u_ananya')); assert.equal(re.status, 'Pending QA Closeout'); });
console.log(`\n${pass} checks passed`);
