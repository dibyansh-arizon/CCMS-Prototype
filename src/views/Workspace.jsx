import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Lock, ShieldCheck, Download, AlertTriangle, Undo2, Pencil, FileText, Paperclip, Upload, FileDown } from 'lucide-react';
import * as E from '../engine.js';
import { Badge, StatusBadge, Button, Card, Banner, Field, Input, Select, FilePicker, FileChip, Modal, Empty, ASSESS_TONE, ACTION_TONE } from '../ui.jsx';
import { STAGES, STATUS as S, ASSESSMENT_BY_KEY } from '../data/forms.js';
import { userById, EMPLOYEES } from '../data/people.js';
import { fmtDate, fmtDateTime, daysFrom, downloadCSV, cx } from '../util.js';
import { downloadReport } from '../report.js';
import Panels from './Panels.jsx';
import { AssessmentReadOnly } from './Forms.jsx';
import { ChangeTable } from './ChangeTable.jsx';
import { ExtensionModal, AmendmentModal } from './Modals.jsx';

export function StageTracker({ rec }) {
  const cur = E.stageOf(rec);
  const stopped = [S.REJECTED, S.CANCELLED].includes(rec.status);
  return (
    <div className="tracker">
      {STAGES.map((s) => {
        const state = cur > 8 || s.n < cur ? 'done' : s.n === cur ? (stopped ? 'stopped' : 'current') : '';
        return <div key={s.n} className={cx('step', state)}><div className="dot">{state === 'done' ? <Check size={16} /> : stopped && s.n === cur ? '×' : s.n}</div><div className="nm">{s.name}</div></div>;
      })}
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
        const can = E.extensionActor(rec, e, ctx); const step = e.chain[e.step];
        return (
          <div key={e.id} className="acard">
            <div className="row between wrap"><div><b>{e.id}</b> · Extension no. {e.level} · +{e.days} days</div><Badge tone={e.status === 'Approved' ? 'green' : e.status === 'Rejected' ? 'red' : e.status === 'Pending' ? 'orange' : 'red'}>{e.status}</Badge></div>
            <div className="small muted mt-s">Requested by {e.requestedBy} on {fmtDate(e.requestedAt)} – {e.reason}</div>
            <div className="row wrap mt-s">{e.chain.map((s, i) => <Badge key={i} tone={s.done ? 'green' : i === e.step && e.status === 'Pending' ? 'orange' : ''}>{s.label}</Badge>)}</div>
            {e.decisions.map((d, i) => <div key={i} className="small mt-s"><b>{d.label}</b> – {d.decision} by {d.by}{d.comment && `: “${d.comment}”`}</div>)}
            {can && (
              <div className="row wrap mt-s">
                <div className="grow"><Input placeholder="Comment (mandatory to reject / return)" value={c[e.id] || ''} onChange={(x) => setC({ ...c, [e.id]: x.target.value })} /></div>
                <Button variant="primary" sm onClick={() => perform(rec, E.decideExtension, [e.id, { decision: 'approve', comment: c[e.id] }], { sign: 'Extension decision', summary: `Extension ${e.id}`, success: 'Extension decision recorded' })}>{step.kind === 'forward_only' ? 'Approve & forward to CEO' : step.kind === 'step' ? 'Approve & pass on' : 'Approve (final)'}</Button>
                {step.kind === 'final_or_forward' && <Button sm onClick={() => perform(rec, E.decideExtension, [e.id, { decision: 'forward', comment: c[e.id] }], { success: 'Forwarded to the CEO' })}>Forward to CEO</Button>}
                <Button sm onClick={() => perform(rec, E.decideExtension, [e.id, { decision: 'return', comment: c[e.id] }], { success: 'Returned for correction' })}>Return</Button>
                <Button variant="danger" sm onClick={() => perform(rec, E.decideExtension, [e.id, { decision: 'reject', comment: c[e.id] }], { success: 'Extension rejected' })}>Reject</Button>
              </div>)}
          </div>
        );
      })}
      {rec.amendments.map((a) => (
        <div key={a.id} className="acard">
          <div className="row between wrap"><div><b>{a.id}</b> · Amendment request <Badge tone="orange">pending QA/Management confirmation of rules</Badge></div><Badge tone={a.status === 'Authorized' ? 'green' : a.status === 'Declined' ? 'red' : 'orange'}>{a.status}</Badge></div>
          <div className="mt-s">{a.description}</div><div className="small muted">Owner {userById(a.ownerId)?.name} · due {fmtDate(a.due)} · {a.reason}</div>
          {a.status === 'Pending' && perm.decideAmendment && (
            <div className="row mt-s"><div className="grow"><Input placeholder="Comment (mandatory to decline)" value={c[a.id] || ''} onChange={(x) => setC({ ...c, [a.id]: x.target.value })} /></div>
              <Button variant="primary" sm onClick={() => perform(rec, E.decideAmendment, [a.id, { decision: 'authorize', comment: c[a.id] }], { sign: 'Amendment authorization', summary: `Authorize ${a.id}`, success: 'Amendment authorized – action added' })}>Authorize</Button>
              <Button variant="danger" sm onClick={() => perform(rec, E.decideAmendment, [a.id, { decision: 'reject', comment: c[a.id] }], { success: 'Amendment declined' })}>Decline</Button></div>)}
        </div>
      ))}
    </div>
  );
}

function Overview({ rec, ctx, perm, perform }) {
  const kv = (k, v) => <React.Fragment key={k}><dt>{k}</dt><dd>{v || '—'}</dd></React.Fragment>;
  return (
    <div className="grid g-main">
      <div className="col" style={{ gap: 16 }}>
        <Card title="Changes" sub="Current state, proposed change and justification – the same table every reviewer sees">
          {rec.type === 'Equipment/Facility/Utility' && <div className="mb"><Banner tone="warn" icon={AlertTriangle}><b>QAD pre-approval required</b> for cGMP facility/equipment changes before implementation.</Banner></div>}
          <ChangeTable rows={rec.changes} readOnly />
          {rec.description && <div className="mt small"><b>Summary:</b> {rec.description}</div>}
        </Card>
        {(rec.extensions.length > 0 || rec.amendments.length > 0) && <Card title="Extensions and amendments"><ExtAmd rec={rec} ctx={ctx} perm={perm} perform={perform} /></Card>}
      </div>
      <div className="col" style={{ gap: 16 }}>
        <Card title="Record summary"><dl className="kv" style={{ gridTemplateColumns: '130px 1fr' }}>
          {kv('CC number', rec.ccNumber || `${rec.draftId} (temporary)`)}{kv('Status', <StatusBadge status={rec.status} />)}{kv('Type', rec.type === 'Other' ? `Other – ${rec.otherType}` : rec.type)}{kv('Initiator', rec.initiatorName)}{kv('Department', rec.department)}{kv('Date requested', fmtDate(rec.dateRequested))}
          {kv('Current doc/equipment', rec.currentDoc)}{kv('Proposed doc/equipment', rec.proposedDoc)}{rec.ccNumber && kv('Issued by', `${rec.issuedBy} · ${fmtDate(rec.issuedAt)}`)}{kv('Review round', rec.round || 1)}
          {rec.approvedAt && kv('QA approved', fmtDate(rec.approvedAt))}{rec.dueDate && kv('Overall due date', <>{fmtDate(rec.dueDate)} {E.isFinal(rec) ? null : <DueChip date={rec.dueDate} />}</>)}{rec.closedAt && kv('Closed', fmtDate(rec.closedAt))}
          {rec.reg && kv('Client approval', rec.reg.clientRequired ? (rec.reg.clientEvidence ? <Badge tone="green">Received – {rec.reg.clientName}</Badge> : <Badge tone="orange">Required – {rec.reg.clientName}</Badge>) : 'Not required')}{rec.sopNumber && kv('Approved SOP', rec.sopNumber)}</dl></Card>
        {rec.dueHistory?.length > 1 && <Card title="Due date history">{rec.dueHistory.map((x, i) => <div key={i} className="row between small" style={{ padding: '4px 0' }}><span>{fmtDate(x.date)}</span><span className="muted">{x.reason}</span></div>)}</Card>}
      </div>
    </div>
  );
}

function AssessmentsTab({ rec, ctx }) {
  if (!rec.assessments.length) return <Empty>Departmental assessments start after QA screening issues the CC number.</Empty>;
  return (
    <div className="col" style={{ gap: 14 }}>
      {[S.ASSESS, S.CLARIFY, S.REENDORSE].includes(rec.status) && <Banner tone="info" icon={Lock}>Review round {rec.round || 1}. While assessments run, each HOD sees only their own checklist. If any HOD requests a correction, the initiator responds, the initiator’s HOD re-endorses, and ALL designated HODs reassess.</Banner>}
      <div className="grid g2">
        {rec.assessments.map((a) => {
          const def = ASSESSMENT_BY_KEY[a.key];
          const mine = a.assignees.includes(ctx.user.id);
          const visible = E.canViewAssessment(rec, a, ctx);
          const done = ['Accepted', 'Accepted with Action'].includes(a.status);
          return (
            <div key={a.key} className={cx('acard', mine && rec.status === S.ASSESS && a.status === 'Pending' && 'mine')}>
              <div className="row between wrap"><h3>{def.name}</h3><Badge tone={ASSESS_TONE[a.status]}>{a.status}</Badge></div>
              <div className="small muted">{def.completedBy}</div>
              <div className="small mt-s">Assigned to: <b>{E.assigneeLabel(rec, a)}</b>{a.completedBy && <> · signed by <b>{a.completedBy}</b> on {fmtDate(a.completedAt)}</>}</div>
              {visible ? (done || a.status === 'Not Acceptable' || Object.keys(a.answers).length) ? (<>
                <AssessmentReadOnly def={def} assessment={a} />
                {a.status === 'Not Acceptable' && <Banner tone="danger"><b>Justification:</b> {a.justification}</Banner>}
                {rec.actions.filter((x) => x.sourceKey === a.key).map((x) => <div key={x.id} className="small mt-s"><Badge tone="navy">{x.id}</Badge> {x.description} → <b>{userById(x.ownerId)?.name}</b> · {fmtDate(x.due)}</div>)}
              </>) : <div className="muted small mt-s">Not yet completed.</div> : <div className="lock small"><Lock size={14} /> Content visible to the assessing HOD only until assessments close.</div>}
              {visible && a.clarifications.map((c, i) => <div key={i} className="small mt-s" style={{ background: '#fff4e5', padding: 8, borderRadius: 6 }}><b>Clarification:</b> {c.q}{c.a && <><br /><b>Response:</b> {c.a}</>}</div>)}
              {visible && (a.rounds || []).map((x) => <details key={x.round} className="small mt-s"><summary>Round {x.round} (preserved) – {x.status}, signed by {x.completedBy || '—'}</summary><div className="muted">{Object.entries(x.answers || {}).filter(([k]) => !k.endsWith('Other')).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ')}</div></details>)}
            </div>
          );
        })}
      </div>
      {rec.reg && (
        <Card title="Regulatory assessment and client requirements" sub={rec.reg.completedBy ? `Completed by ${rec.reg.completedBy} on ${fmtDate(rec.reg.completedAt)}` : 'Pending (round ' + (rec.round || 1) + ')'}>
          <dl className="kv"><dt>ANDA/DMF status</dt><dd>{rec.reg.andaStatus || '—'}</dd><dt>Regulatory assessment</dt><dd>{rec.reg.applicable || '—'}</dd><dt>Reporting criteria</dt><dd>{rec.reg.reporting?.join('; ') || '—'}</dd><dt>Regulatory action required</dt><dd>{rec.reg.regActionRequired ? 'Yes' : 'No'}</dd><dt>Client approval required</dt><dd>{rec.reg.clientRequired ? `Yes – ${rec.reg.clientName} (action is in the common list)` : 'No'}</dd>
            {rec.reg.clientEvidence && <><dt>Client evidence</dt><dd><FileChip name={rec.reg.clientEvidence.fileName} /> reviewed by {rec.reg.clientEvidence.reviewedBy}</dd></>}</dl>
        </Card>
      )}
    </div>
  );
}

function ActionsTab({ rec, ctx, perm, perform, openAction }) {
  const [open, setOpen] = useState(openAction || null);
  const [f, setF] = useState({ status: '', comment: '', evidence: '', evidenceNA: false, reason: '', owner: '' });
  const prep = (a) => setF({ status: a.status === 'Not Started' ? 'In Progress' : a.status, comment: a.comment || '', evidence: '', evidenceNA: !!a.evidenceNA, reason: '', owner: '' });
  useEffect(() => { if (openAction) { setOpen(openAction); const a = rec.actions.find((x) => x.id === openAction); if (a) prep(a); } }, [openAction]);
  const toggle = (a) => { setOpen(open === a.id ? null : a.id); prep(a); };
  if (!rec.actions.length) return <Empty>No action items yet. They appear as HODs, Regulatory Affairs, the initiator and QA add them.</Empty>;
  return (
    <div className="col">
      {rec.actions.some((a) => a.status === 'Planned') && <Banner tone="info" icon={Lock}>Action items are planned but locked. They are released to their owners only after QA final approval.</Banner>}
      <Card pad={false}><div className="table-wrap"><table className="t">
        <thead><tr><th>ID</th><th>Source</th><th>Action item</th><th>Owner</th><th>Target date</th><th>Status</th><th></th></tr></thead>
        <tbody>{rec.actions.map((a) => {
          const work = E.canWorkOnAction(rec, a, ctx) && a.status !== 'Completed';
          const canReturn = perm.isInitiator && (rec.status === S.IMPL || perm.resubmitCloseout) && a.status === 'Completed';
          const canReassign = perm.manageActions && a.status !== 'Completed';
          return (<React.Fragment key={a.id}>
            <tr className={open === a.id ? '' : ''}>
              <td className="mono">{a.id}</td><td>{a.source}</td>
              <td>{a.description}{a.flagged && <div className="small"><Badge tone="orange">Flagged by QA</Badge> {a.flagged}</div>}{a.returned && a.status === 'In Progress' && <div className="small" style={{ color: 'var(--danger)' }}>Returned: {a.returned}</div>}{a.comment && <div className="small muted">“{a.comment}”</div>}{a.evidence.map((x) => <div key={x} className="mt-s"><FileChip name={x} /></div>)}{a.evidenceNA && !a.evidence.length && <div className="small muted">No evidence applicable</div>}</td>
              <td>{userById(a.ownerId)?.name}</td>
              <td>{fmtDate(a.due)}{a.originalDue && <div className="small muted">orig. {fmtDate(a.originalDue)}</div>}{E.isOverdue(a) && <div><Badge tone="red">Overdue</Badge></div>}</td>
              <td><Badge tone={ACTION_TONE[a.status]}>{a.status}</Badge></td>
              <td>{(work || canReturn || canReassign) && <Button sm variant={work ? 'primary' : ''} onClick={() => toggle(a)}>{work ? 'Update' : canReturn ? 'Review' : 'Reassign'}</Button>}</td>
            </tr>
            {open === a.id && (<tr><td colSpan={7} style={{ background: '#fafbfd' }}><div className="col">
              {work && (<><div className="grid g3">
                <Field label="Status"><Select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option>Not Started</option><option>In Progress</option><option>Completed</option></Select></Field>
                <Field label={f.status === 'Completed' ? 'Completion comment (mandatory)' : 'Comment'}><Input value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></Field>
                <Field label="Supporting evidence (where applicable)"><div className="filebox">{f.evidence ? <FileChip name={f.evidence} /> : <span className="muted small">None</span>}<FilePicker label="Upload" onPick={(n) => setF({ ...f, evidence: n, evidenceNA: false })} /></div><label className="chk" style={{ width: 'fit-content' }}><input type="checkbox" checked={f.evidenceNA} onChange={(e) => setF({ ...f, evidenceNA: e.target.checked })} />No evidence applicable</label></Field></div>
                <div><Button variant="primary" onClick={() => perform(rec, E.updateAction, [a.id, { status: f.status, comment: f.comment, evidenceName: f.evidence, evidenceNA: f.evidenceNA }], { success: `${a.id} updated` }) && setOpen(null)}>Save update</Button></div></>)}
              {canReturn && <div className="row"><div className="grow"><Input placeholder="What is incomplete?" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div><Button icon={Undo2} onClick={() => perform(rec, E.returnAction, [a.id, f.reason], { success: 'Action returned to its owner' }) && setOpen(null)}>Return action for correction</Button></div>}
              {canReassign && <div className="row"><Select style={{ maxWidth: 300 }} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}><option value="">Reassign to…</option>{EMPLOYEES.map((u) => <option key={u.id} value={u.id}>{u.name} – {u.dept}</option>)}</Select><Button onClick={() => perform(rec, E.reassignAction, [a.id, f.owner, ''], { success: 'Action reassigned (recorded in history)' }) && setOpen(null)}>Reassign</Button></div>}
            </div></td></tr>)}
          </React.Fragment>);
        })}</tbody></table></div></Card>
    </div>
  );
}

// Documents: grouped by document with full version history; preview for everyone who can open the CC
function DocsTab({ rec, ctx, perm, perform }) {
  const [kind, setKind] = useState('Supporting document'); const [replace, setReplace] = useState(''); const [prev, setPrev] = useState(null);
  const current = rec.attachments.filter((a) => !a.superseded);
  const kinds = E.ATT_KINDS.filter((k) => k !== 'Action evidence' && k !== 'Client approval');
  return (
    <div className="col">
      {perm.attach && (
        <Card title="Upload document" sub="Multiple uploads are allowed. A new version never overwrites earlier drafts – all versions are retained.">
          <div className="row wrap">
            <Select style={{ width: 220 }} value={kind} onChange={(e) => setKind(e.target.value)}>{kinds.map((k) => <option key={k}>{k}</option>)}</Select>
            <Select style={{ width: 280 }} value={replace} onChange={(e) => setReplace(e.target.value)}><option value="">New document</option>{current.map((a) => <option key={a.id} value={a.id}>New version of: {a.name} (v{a.version || 1})</option>)}</Select>
            <FilePicker label="Choose file & upload" onPick={(n) => perform(rec, E.addAttachment, [{ name: n, kind, replaceId: replace || undefined }], { success: 'Document uploaded' })} />
          </div>
          <div className="help mt-s">“Final signed document” is available during implementation and closeout.</div>
        </Card>)}
      <Card title="Documents" pad={false}>
        {rec.attachments.length ? <table className="t"><thead><tr><th>Document</th><th>Type</th><th>Version</th><th>Stage</th><th>Uploaded by</th><th>Date</th><th></th></tr></thead>
          <tbody>{[...rec.attachments].sort((a, b) => (a.docKey || a.name).localeCompare(b.docKey || b.name) || (b.version || 1) - (a.version || 1)).map((a) => <tr key={a.id} style={a.superseded ? { opacity: 0.65 } : undefined}><td><FileText size={14} /> {a.name}{a.superseded && <div><Badge>Superseded – retained</Badge></div>}</td><td>{a.kind}</td><td>v{a.version || 1}</td><td>{a.stage || '—'}</td><td>{a.by}</td><td>{fmtDateTime(a.at)}</td><td><Button sm onClick={() => setPrev(a)}>Preview</Button></td></tr>)}</tbody></table> : <Empty>No documents yet.</Empty>}
      </Card>
      {prev && <Modal title={prev.name} sub={`${prev.kind} · v${prev.version || 1} · ${prev.stage || ''}`} onClose={() => setPrev(null)} footer={<Button onClick={() => setPrev(null)}>Close</Button>}><div className="preview"><FileText size={36} /><div>Document preview (prototype)</div></div><div className="small muted">Uploaded by {prev.by} on {fmtDateTime(prev.at)}. Visible to everyone authorized to open this Change Control.</div></Modal>}
    </div>
  );
}

export function HistoryTab({ rec }) {
  const [filter, setFilter] = useState('all');
  const items = [...rec.history].reverse().filter((h) => filter === 'all' || (filter === 'sig' ? !!h.signature : /Action|action/.test(h.action)));
  return (
    <Card title="Activity history" sub="Every event, decision and electronic signature on this Change Control (cannot be edited)"
      right={<div className="row"><div className="seg">{[['all', 'All'], ['sig', 'Signatures'], ['act', 'Action items']].map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>)}</div><Button sm icon={Download} onClick={() => downloadCSV(`${rec.ccNumber || rec.draftId}-history.csv`, [['Date/time', 'User', 'Role', 'Event', 'Detail', 'E-signature'], ...rec.history.map((h) => [h.at, h.actor, h.role, h.action, h.detail, h.signature?.meaning || ''])])}>Export</Button></div>}>
      <div className="timeline">{items.map((h) => (
        <div key={h.id} className={cx('tl', h.signature && 'sig', /Rejected|cancel|Returned/i.test(h.action) && 'stop', /closed|Approved|Accepted|completed/i.test(h.action) && 'ok')}>
          <span className="pt" /><div className="row between wrap"><b>{h.action}</b><span className="muted small">{fmtDateTime(h.at)}</span></div>
          {h.detail && <div className="small" style={{ color: '#475467' }}>{h.detail}</div>}<div className="small muted">{h.actor} · {h.role}</div>
          {h.signature && <div className="sigline"><ShieldCheck size={13} /> Electronically signed by {h.signature.signer} · {h.signature.meaning}</div>}
        </div>))}{!items.length && <div className="muted">No events match this filter.</div>}</div>
    </Card>
  );
}

export default function Workspace({ rec, ctx, records, perform, onBack, onEdit, onBehalf, tab, setTab, openAction }) {
  const [modal, setModal] = useState(null);
  const perm = E.perms(rec, ctx);
  const tabs = [['overview', 'Overview'], ['assess', 'Assessments'], ['actions', 'Actions', rec.actions.length], ['docs', 'Documents', rec.attachments.length], ['history', 'Activity History', rec.history.length]];
  return (
    <div className="col" style={{ gap: 16 }}>
      <div><button className="btn ghost" onClick={onBack}><ArrowLeft size={16} /> Back</button></div>
      <div className="card">
        <div className="card-h" style={{ alignItems: 'flex-start' }}>
          <div>
            <div className="row wrap"><span className="cc-no" style={{ fontSize: 16 }}>{rec.ccNumber || rec.draftId}</span><StatusBadge status={rec.status} /><Badge tone="navy">{rec.type === 'Other' ? rec.otherType : rec.type}</Badge>{(rec.round || 1) > 1 && <Badge tone="orange">Review round {rec.round}</Badge>}</div>
            <h1 style={{ marginTop: 6 }}>{rec.title || 'Untitled Change Control'}</h1>
            <div className="muted small mt-s">Initiated by {rec.initiatorName} · {rec.department} · {fmtDate(rec.dateRequested)}{rec.dueDate && ` · due ${fmtDate(rec.dueDate)}`}</div>
          </div>
          <div className="row wrap" style={{ justifyContent: 'flex-end' }}>
            {perm.edit && <Button icon={Pencil} onClick={onEdit}>Edit</Button>}
            {perm.requestExtension && <Button onClick={() => setModal('ext')}>Request extension</Button>}
            {perm.requestAmendment && <Button onClick={() => setModal('amd')}>Request amendment</Button>}
            <Button icon={FileDown} onClick={() => downloadReport(rec, 'interim')}>Interim report</Button>
            <Button icon={FileDown} variant={rec.status === S.CLOSED ? 'primary' : ''} disabled={rec.status !== S.CLOSED} title={rec.status === S.CLOSED ? '' : 'Available after closure'} onClick={() => downloadReport(rec, 'final')}>Final dossier</Button>
          </div>
        </div>
        <StageTracker rec={rec} />
      </div>
      <Panels rec={rec} ctx={ctx} perm={perm} perform={perform} records={records} onBehalf={onBehalf} openExt={() => setModal('ext')} openAmd={() => setModal('amd')} setTab={setTab} onEdit={onEdit} />
      <div className="card">
        <div className="tabs">{tabs.map(([k, l, n]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{n !== undefined && <span className="n">{n}</span>}</button>)}</div>
        <div className="card-b" style={{ background: '#fafbfd', borderRadius: '0 0 10px 10px' }}>
          {tab === 'overview' && <Overview rec={rec} ctx={ctx} perm={perm} perform={perform} />}
          {tab === 'assess' && <AssessmentsTab rec={rec} ctx={ctx} />}
          {tab === 'actions' && <ActionsTab rec={rec} ctx={ctx} perm={perm} perform={perform} openAction={openAction} />}
          {tab === 'docs' && <DocsTab rec={rec} ctx={ctx} perm={perm} perform={perform} />}
          {tab === 'history' && <HistoryTab rec={rec} />}
        </div>
      </div>
      {modal === 'ext' && <ExtensionModal rec={rec} perform={perform} onClose={() => setModal(null)} />}
      {modal === 'amd' && <AmendmentModal rec={rec} perform={perform} onClose={() => setModal(null)} />}
    </div>
  );
}
