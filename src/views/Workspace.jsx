import React, { useState } from 'react';
import { ArrowLeft, Check, Lock, ShieldCheck, FileText, Download, AlertTriangle, CircleDot, History as HistoryIcon, Pencil, Undo2 } from 'lucide-react';
import * as E from '../engine.js';
import { Badge, StatusBadge, Button, Card, Banner, Field, Input, TextArea, Select, FilePicker, FileChip, Modal, Empty, ASSESS_TONE, ACTION_TONE } from '../ui.jsx';
import { STAGES, STATUS as S, ASSESSMENT_BY_KEY, EXTENSION_LEVELS } from '../data/forms.js';
import { userById, EMPLOYEES } from '../data/people.js';
import { fmtDate, fmtDateTime, daysFrom, downloadCSV, cx } from '../util.js';
import Panels, { ActionTable } from './Panels.jsx';
import { AssessmentReadOnly } from './Forms.jsx';

// ------------------------------------------------------------------ stage tracker (Master Workflow stages)
export function StageTracker({ rec }) {
  const cur = E.stageOf(rec);
  const stopped = [S.REJECTED, S.CANCELLED].includes(rec.status);
  return (
    <div className="tracker">
      {STAGES.map((s) => {
        const state = cur > 8 || s.n < cur ? 'done' : s.n === cur ? (stopped ? 'stopped' : 'current') : '';
        return (
          <div key={s.n} className={cx('step', state)}>
            <div className="dot">{state === 'done' ? <Check size={16} /> : stopped && s.n === cur ? '×' : s.n}</div>
            <div className="nm">{s.name}</div>
          </div>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------------ overview
function Overview({ rec, ctx, perm, perform }) {
  const kv = (k, v) => <React.Fragment key={k}><dt>{k}</dt><dd>{v || '—'}</dd></React.Fragment>;
  return (
    <div className="grid g-main">
      <div className="col" style={{ gap: 16 }}>
        <Card title="Change details">
          {rec.type === 'Equipment/Facility/Utility' && <div className="mb"><Banner tone="warn" icon={AlertTriangle}><b>QAD pre-approval required.</b> Changes to cGMP facilities or equipment need QAD approval before implementation.{rec.layoutPlan && ' A facility layout plan is part of this request.'}</Banner></div>}
          <dl className="kv">
            {kv('Title', rec.title)}
            {kv('Type of change', rec.type === 'Other' ? `Other – ${rec.otherType}` : rec.type)}
            {kv('Current document / material / equipment no.', rec.currentDoc)}
            {kv('Proposed document / material / equipment no.', rec.proposedDoc)}
            {kv('Supporting / reference documents', rec.supportingDocs)}
            {kv('Description', rec.description)}
            {kv('Current state', rec.currentState)}
            {kv('Proposed change', rec.proposedChange)}
            {kv('Justification', rec.justification)}
          </dl>
        </Card>
        {(rec.extensions.length > 0 || rec.amendments.length > 0) && (
          <Card title="Extensions and amendments">
            <ExtAmd rec={rec} ctx={ctx} perm={perm} perform={perform} />
          </Card>
        )}
      </div>
      <div className="col" style={{ gap: 16 }}>
        <Card title="Record summary">
          <dl className="kv" style={{ gridTemplateColumns: '130px 1fr' }}>
            {kv('CC number', rec.ccNumber || `${rec.draftId} (temporary)`)}
            {kv('Status', <StatusBadge status={rec.status} />)}
            {kv('Initiator', rec.initiatorName)}
            {kv('Department', rec.department)}
            {kv('Date requested', fmtDate(rec.dateRequested))}
            {rec.ccNumber && kv('Issued by', `${rec.issuedBy} · ${fmtDate(rec.issuedAt)}`)}
            {rec.approvedAt && kv('QA approved', fmtDate(rec.approvedAt))}
            {rec.dueDate && kv('Overall due date', <>{fmtDate(rec.dueDate)} {E.isFinal(rec) ? null : <DueChip date={rec.dueDate} />}</>)}
            {rec.closedAt && kv('Closed', fmtDate(rec.closedAt))}
            {rec.reg && kv('Regulatory', `${rec.reg.applicable}${rec.reg.reporting?.length ? ' · ' + rec.reg.reporting.join('; ') : ''}`)}
            {rec.reg && kv('Client approval', rec.reg.clientRequired ? (rec.reg.clientEvidence ? <Badge tone="green">Received – {rec.reg.clientName}</Badge> : <Badge tone="red">Pending – {rec.reg.clientName}</Badge>) : 'Not required')}
            {rec.sopNumber && kv('Approved SOP', rec.sopNumber)}
          </dl>
        </Card>
        {rec.dueHistory?.length > 1 && (
          <Card title="Due date history">
            {rec.dueHistory.map((d, i) => <div key={i} className="row between small" style={{ padding: '4px 0' }}><span>{fmtDate(d.date)}</span><span className="muted">{d.reason}</span></div>)}
          </Card>
        )}
      </div>
    </div>
  );
}
export function DueChip({ date }) {
  const d = daysFrom(date);
  if (d === null) return null;
  return <Badge tone={d < 0 ? 'red' : d <= 7 ? 'orange' : 'green'}>{d < 0 ? `${-d} days overdue` : d === 0 ? 'due today' : `${d} days left`}</Badge>;
}

function ExtAmd({ rec, ctx, perm, perform }) {
  const [c, setC] = useState({});
  return (
    <div className="col">
      {rec.extensions.map((e) => {
        const can = E.extensionActor(rec, e, ctx);
        return (
          <div key={e.id} className="acard">
            <div className="row between wrap"><div><b>{e.id}</b> · {EXTENSION_LEVELS[e.level - 1].label}</div><Badge tone={e.status === 'Approved' ? 'green' : e.status === 'Rejected' ? 'red' : 'orange'}>{e.status}</Badge></div>
            <div className="small muted mt-s">Requested by {e.requestedBy} on {fmtDate(e.requestedAt)} – {e.reason}</div>
            <div className="row wrap mt-s">{e.chain.map((s, i) => <Badge key={i} tone={s.done ? 'green' : i === e.step && e.status === 'Pending' ? 'orange' : ''}>{s.type === 'review' ? 'Review' : 'Approve'}: {s.label}</Badge>)}</div>
            {can && (
              <div className="row mt-s">
                <Input placeholder="Comment (mandatory to reject)" value={c[e.id] || ''} onChange={(x) => setC({ ...c, [e.id]: x.target.value })} />
                <Button variant="primary" sm onClick={() => perform(rec, E.decideExtension, [e.id, { decision: 'approve', comment: c[e.id] }], { sign: 'Extension decision', summary: `Extension ${e.id}`, success: 'Extension decision recorded' })}>{e.chain[e.step].type === 'review' ? 'Review' : 'Approve'}</Button>
                <Button variant="danger" sm onClick={() => perform(rec, E.decideExtension, [e.id, { decision: 'reject', comment: c[e.id] }], { sign: 'Extension decision', summary: `Reject ${e.id}`, success: 'Extension rejected' })}>Reject</Button>
              </div>
            )}
          </div>
        );
      })}
      {rec.amendments.map((a) => (
        <div key={a.id} className="acard">
          <div className="row between wrap"><div><b>{a.id}</b> · Amendment request</div><Badge tone={a.status === 'Authorized' ? 'green' : a.status === 'Declined' ? 'red' : 'orange'}>{a.status}</Badge></div>
          <div className="mt-s">{a.description}</div>
          <div className="small muted">Owner {userById(a.ownerId)?.name} · due {fmtDate(a.due)} · {a.reason}</div>
          {a.status === 'Pending' && perm.decideAmendment && (
            <div className="row mt-s">
              <Input placeholder="Comment (mandatory to decline)" value={c[a.id] || ''} onChange={(x) => setC({ ...c, [a.id]: x.target.value })} />
              <Button variant="primary" sm onClick={() => perform(rec, E.decideAmendment, [a.id, { decision: 'authorize', comment: c[a.id] }], { sign: 'Amendment authorization', summary: `Authorize ${a.id}`, success: 'Amendment authorized – action added' })}>Authorize</Button>
              <Button variant="danger" sm onClick={() => perform(rec, E.decideAmendment, [a.id, { decision: 'reject', comment: c[a.id] }], { success: 'Amendment declined' })}>Decline</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ assessments tab (visibility rules applied)
function AssessmentsTab({ rec, ctx }) {
  if (!rec.assessments.length) return <Empty>Departmental assessments start after QA screening issues the CC number.</Empty>;
  return (
    <div className="col" style={{ gap: 14 }}>
      {rec.status === S.ASSESS && <Banner tone="info" icon={Lock}>While assessments are running, each department sees only its own checklist. Other departments’ answers become visible after all assessments are complete.</Banner>}
      <div className="grid g2">
        {rec.assessments.map((a) => {
          const def = ASSESSMENT_BY_KEY[a.key];
          const mine = a.assignees.some((id) => ctx.eff.includes(id));
          const visible = E.canViewAssessment(rec, a, ctx);
          const done = ['Accepted', 'Accepted with Action'].includes(a.status);
          return (
            <div key={a.key} className={cx('acard', mine && rec.status === S.ASSESS && a.status === 'Pending' && 'mine')}>
              <div className="row between wrap"><h3>{def.name}</h3><Badge tone={ASSESS_TONE[a.status]}>{a.status}</Badge></div>
              <div className="small muted">{def.completedBy}</div>
              <div className="small mt-s">Assigned to: <b>{E.assigneeLabel(rec, a)}</b>{a.completedBy && <> · completed by <b>{a.completedBy}</b> on {fmtDate(a.completedAt)}</>}</div>
              {visible ? (done || a.status === 'Not Acceptable' || Object.keys(a.answers).length > 0) ? (
                <>
                  <AssessmentReadOnly def={def} assessment={a} />
                  {a.status === 'Not Acceptable' && <Banner tone="danger"><b>Justification:</b> {a.justification}</Banner>}
                  {rec.actions.filter((x) => x.sourceKey === a.key).map((x) => <div key={x.id} className="small mt-s"><Badge tone="navy">{x.id}</Badge> {x.description} → <b>{userById(x.ownerId)?.name}</b></div>)}
                </>
              ) : <div className="muted small mt-s">Not yet completed.</div> : (
                <div className="lock small"><Lock size={14} /> Content visible to the assessing department only until assessments close.</div>
              )}
              {visible && a.clarifications.map((c, i) => <div key={i} className="small mt-s" style={{ background: '#fff4e5', padding: 8, borderRadius: 6 }}><b>Clarification:</b> {c.q}{c.a && <><br /><b>Response:</b> {c.a}</>}</div>)}
            </div>
          );
        })}
      </div>
      {rec.reg && (
        <Card title="Regulatory assessment and client requirements" sub={rec.reg.completedBy ? `Completed by ${rec.reg.completedBy} on ${fmtDate(rec.reg.completedAt)}` : ''}>
          <dl className="kv">
            <dt>ANDA/DMF status</dt><dd>{rec.reg.andaStatus || '—'}</dd><dt>Regulatory assessment</dt><dd>{rec.reg.applicable || '—'}</dd>
            <dt>Reporting criteria</dt><dd>{rec.reg.reporting?.join('; ') || '—'}</dd><dt>Reference</dt><dd>{rec.reg.reference || '—'}</dd>
            <dt>Regulatory action required</dt><dd>{rec.reg.regActionRequired ? 'Yes' : 'No'}</dd><dt>Client approval required</dt>
            <dd>{rec.reg.clientRequired ? `Yes – ${rec.reg.clientName}` : 'No'}</dd>
            {rec.reg.clientEvidence && <><dt>Client evidence</dt><dd><FileChip name={rec.reg.clientEvidence.fileName} /> reviewed by {rec.reg.clientEvidence.reviewedBy} · uploaded by {rec.reg.clientEvidence.by} on {fmtDate(rec.reg.clientEvidence.at)}</dd></>}
          </dl>
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ actions tab
function ActionsTab({ rec, ctx, perm, perform }) {
  const [open, setOpen] = useState(null);
  const [f, setF] = useState({ status: '', comment: '', evidence: '', reason: '', owner: '' });
  const toggle = (a) => { setOpen(open === a.id ? null : a.id); setF({ status: a.status === 'Not Started' ? 'In Progress' : a.status, comment: a.comment || '', evidence: '', reason: '', owner: '' }); };
  if (!rec.actions.length) return <Empty>No action items yet. They appear as departments, Regulatory Affairs, the initiator and QA add them.</Empty>;
  const planned = rec.actions.some((a) => a.status === 'Planned');
  return (
    <div className="col">
      {planned && <Banner tone="info" icon={Lock}>Action items are planned but locked. They are released to their owners only after QA final approval.</Banner>}
      <Card pad={false}>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>ID</th><th>Source</th><th>Action item</th><th>Owner</th><th>Due</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rec.actions.map((a) => {
                const work = E.canWorkOnAction(rec, a, ctx) && a.status !== 'Completed';
                const canReturn = perm.isInitiator && rec.status === S.IMPL && a.status === 'Completed';
                const canReassign = perm.manageActions && a.status !== 'Completed';
                const over = E.isOverdue(a);
                return (
                  <React.Fragment key={a.id}>
                    <tr>
                      <td className="mono">{a.id}</td><td>{a.source}</td>
                      <td>{a.description}{a.returned && a.status === 'In Progress' && <div className="small" style={{ color: 'var(--danger)' }}>Returned: {a.returned}</div>}{a.comment && <div className="small muted">“{a.comment}”</div>}{a.evidence.map((e) => <div key={e} className="mt-s"><FileChip name={e} /></div>)}</td>
                      <td>{userById(a.ownerId)?.name}</td>
                      <td>{a.due ? fmtDate(a.due) : `${a.durationDays} days after approval`}{over && <div><Badge tone="red">Overdue</Badge></div>}</td>
                      <td><Badge tone={ACTION_TONE[a.status]}>{a.status}</Badge></td>
                      <td>{(work || canReturn || canReassign) && <Button sm onClick={() => toggle(a)}>{work ? 'Update' : canReturn ? 'Review' : 'Reassign'}</Button>}</td>
                    </tr>
                    {open === a.id && (
                      <tr><td colSpan={7} style={{ background: '#fafbfd' }}>
                        <div className="col">
                          {work && (
                            <div className="grid g3">
                              <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Not Started</option><option>In Progress</option><option>Completed</option></Select></Field>
                              <Field label={f.status === 'Completed' ? 'Completion comment (mandatory)' : 'Comment'}><Input value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></Field>
                              <Field label="Supporting evidence"><div className="filebox">{f.evidence ? <FileChip name={f.evidence} /> : <span className="muted small">None</span>}<FilePicker label="Upload" onPick={(n) => setF({ ...f, evidence: n })} /></div></Field>
                            </div>
                          )}
                          {work && <div><Button variant="primary" onClick={() => perform(rec, E.updateAction, [a.id, { status: f.status, comment: f.comment, evidenceName: f.evidence }], { success: `${a.id} updated` }) && setOpen(null)}>Save update</Button></div>}
                          {canReturn && <div className="row"><Input placeholder="What is incomplete?" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /><Button icon={Undo2} onClick={() => perform(rec, E.returnAction, [a.id, f.reason], { success: 'Action returned to its owner' }) && setOpen(null)}>Return action for correction</Button></div>}
                          {canReassign && (
                            <div className="row"><Select style={{ maxWidth: 300 }} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}><option value="">Reassign to…</option>{EMPLOYEES.map((u) => <option key={u.id} value={u.id}>{u.name} – {u.dept}</option>)}</Select><Button onClick={() => perform(rec, E.reassignAction, [a.id, f.owner, ''], { success: 'Action reassigned (recorded in history)' }) && setOpen(null)}>Reassign</Button></div>
                          )}
                        </div>
                      </td></tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------ documents
function DocsTab({ rec }) {
  if (!rec.attachments.length) return <Empty>No documents have been attached yet.</Empty>;
  return (
    <Card pad={false}>
      <table className="t"><thead><tr><th>Document</th><th>Category</th><th>Uploaded by</th><th>Date</th></tr></thead>
        <tbody>{rec.attachments.map((a) => <tr key={a.id}><td><FileChip name={a.name} /></td><td>{a.kind}</td><td>{a.by}</td><td>{fmtDateTime(a.at)}</td></tr>)}</tbody></table>
    </Card>
  );
}

// ------------------------------------------------------------------ individual change-control activity history
export function HistoryTab({ rec }) {
  const [filter, setFilter] = useState('all');
  const items = [...rec.history].reverse().filter((h) => filter === 'all' || (filter === 'sig' ? !!h.signature : /Action|action/.test(h.action)));
  const exportCSV = () => downloadCSV(`${rec.ccNumber || rec.draftId}-history.csv`, [['Date/time', 'User', 'Role', 'Event', 'Detail', 'E-signature meaning'], ...rec.history.map((h) => [h.at, h.actor, h.role, h.action, h.detail, h.signature?.meaning || ''])]);
  return (
    <Card title="Activity history" sub="Every event, decision and electronic signature on this Change Control (cannot be edited)"
      right={<div className="row"><div className="seg">{[['all', 'All'], ['sig', 'Signatures'], ['act', 'Action items']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div><Button sm icon={Download} onClick={exportCSV}>Export</Button></div>}>
      <div className="timeline">
        {items.map((h) => (
          <div key={h.id} className={cx('tl', h.signature && 'sig', /Rejected|cancel|Returned/i.test(h.action) && 'stop', /closed|Approved|Accepted|completed/i.test(h.action) && 'ok')}>
            <span className="pt" />
            <div className="row between wrap"><b>{h.action}</b><span className="muted small">{fmtDateTime(h.at)}</span></div>
            {h.detail && <div className="small" style={{ color: '#475467' }}>{h.detail}</div>}
            <div className="small muted">{h.actor} · {h.role}{h.signature?.onBehalfOf ? ` (on behalf of ${h.signature.onBehalfOf})` : ''}</div>
            {h.signature && <div className="sigline"><ShieldCheck size={13} /> Electronically signed by {h.signature.signer} · {h.signature.meaning}</div>}
          </div>
        ))}
        {items.length === 0 && <div className="muted">No events match this filter.</div>}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ extension & amendment request modals
function ExtensionModal({ rec, perform, onClose }) {
  const level = rec.extensions.filter((e) => e.status === 'Approved').length + 1;
  const lv = EXTENSION_LEVELS[level - 1];
  const [reason, setReason] = useState('');
  return (
    <Modal title="Request extension" sub={`${rec.ccNumber} · current due date ${fmtDate(rec.dueDate)}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => perform(rec, E.requestExtension, [{ reason }], { sign: 'Extension request', summary: `Request ${lv?.label}`, success: 'Extension request submitted', after: onClose })}>Submit request</Button></>}>
      {lv ? <Banner tone="info"><b>{lv.label}</b><br />Route: {lv.chain.map((c) => `${c.type === 'review' ? 'review' : 'approve'} – ${c.label}`).join(' → ')}</Banner> : <Banner tone="danger">The maximum number of extensions has been reached.</Banner>}
      <Field label="Reason / justification for additional time" req><TextArea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="help">Requests must be made at least one business day before the due date. For facility or equipment changes that need an extended period, an extension is not required if the initiator provides the estimated duration and justification.</div>
    </Modal>
  );
}
function AmendmentModal({ rec, perform, onClose }) {
  const [f, setF] = useState({ description: '', reason: '', ownerId: '', due: '' });
  return (
    <Modal title="Request amendment" sub="An additional action discovered after QA final approval – subject to QA authorization" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => perform(rec, E.requestAmendment, [f], { success: 'Amendment request sent to QA', after: onClose })}>Submit to QA</Button></>}>
      <Field label="Additional action required" req><TextArea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Why was it not identified earlier?" req><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      <div className="grid g2">
        <Field label="Proposed owner" req><Select value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}><option value="">Select…</option>{EMPLOYEES.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
        <Field label="Proposed due date" req><Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

// ------------------------------------------------------------------ workspace
export default function Workspace({ rec, ctx, records, perform, onBack, onEdit, onBehalf, tab, setTab }) {
  const [modal, setModal] = useState(null);
  const perm = E.perms(rec, ctx);
  const tabs = [['overview', 'Overview'], ['assess', 'Assessments'], ['actions', `Actions`, rec.actions.length], ['docs', 'Documents', rec.attachments.length], ['history', 'Activity History', rec.history.length]];
  return (
    <div className="col" style={{ gap: 16 }}>
      <div><button className="btn ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button></div>
      <div className="card">
        <div className="card-h" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="row wrap"><span className="cc-no" style={{ fontSize: 16 }}>{rec.ccNumber || rec.draftId}</span><StatusBadge status={rec.status} /><Badge tone="navy">{rec.type === 'Other' ? rec.otherType : rec.type}</Badge></div>
            <h1 style={{ marginTop: 6 }}>{rec.title || 'Untitled Change Control'}</h1>
            <div className="muted small mt-s">Initiated by {rec.initiatorName} · {rec.department} · {fmtDate(rec.dateRequested)}{rec.dueDate && ` · due ${fmtDate(rec.dueDate)}`}</div>
          </div>
          <div className="row">{perm.edit && <Button icon={Pencil} onClick={onEdit}>Edit</Button>}</div>
        </div>
        <StageTracker rec={rec} />
      </div>
      <Panels rec={rec} ctx={ctx} perm={perm} perform={perform} records={records} onBehalf={onBehalf} openExt={() => setModal('ext')} openAmd={() => setModal('amd')} setTab={setTab} onEdit={onEdit} />
      <div className="card">
        <div className="tabs">{tabs.map(([k, l, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{n !== undefined && <span className="n">{n}</span>}</button>)}</div>
        <div className="card-b" style={{ background: '#fafbfd', borderRadius: '0 0 10px 10px' }}>
          {tab === 'overview' && <Overview rec={rec} ctx={ctx} perm={perm} perform={perform} />}
          {tab === 'assess' && <AssessmentsTab rec={rec} ctx={ctx} />}
          {tab === 'actions' && <ActionsTab rec={rec} ctx={ctx} perm={perm} perform={perform} />}
          {tab === 'docs' && <DocsTab rec={rec} />}
          {tab === 'history' && <HistoryTab rec={rec} />}
        </div>
      </div>
      {modal === 'ext' && <ExtensionModal rec={rec} perform={perform} onClose={() => setModal(null)} />}
      {modal === 'amd' && <AmendmentModal rec={rec} perform={perform} onClose={() => setModal(null)} />}
    </div>
  );
}
