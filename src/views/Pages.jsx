import React, { useMemo, useState } from 'react';
import { Download, Search, Plus, Info, FileDown, Lock } from 'lucide-react';
import * as E from '../engine.js';
import { Badge, StatusBadge, Button, Card, PageHead, Empty, Input, Select, Modal } from '../ui.jsx';
import { STAGES, STATUS as S } from '../data/forms.js';
import { DEPARTMENTS, userById, hasRole, isQadHod } from '../data/people.js';
import { fmtDate, fmtDateTime, downloadCSV, daysFrom } from '../util.js';
import { downloadReport } from '../report.js';
import { ExtensionModal, AmendmentModal } from './Modals.jsx';
import { DueChip } from './Workspace.jsx';

const Mini = ({ rec }) => { const c = E.stageOf(rec); return <div className="mini-stage" title={`Stage ${Math.min(c, 8)} of 8`}>{STAGES.map((s) => <i key={s.n} className={c > 8 || s.n < c ? 'on' : s.n === c ? 'cur' : ''} />)}</div>; };
const label = (r) => r.ccNumber || r.draftId;

// Unified inbox: endorsements, reviews, action items, clarifications, corrections, extension approvals, QA decisions
export function TaskTable({ tasks, open, limit }) {
  const list = limit ? tasks.slice(0, limit) : tasks;
  if (!list.length) return <Empty>Nothing is waiting for you right now.</Empty>;
  return (
    <div className="table-wrap"><table className="t"><thead><tr><th>Change Control</th><th>Type</th><th>Your task</th><th>Progress</th><th></th></tr></thead>
      <tbody>{list.map((t, i) => (
        <tr key={i} className="click" onClick={() => open(t.rec.id, t.tab, t.actionId)}>
          <td><div className="cc-no">{label(t.rec)}</div><div className="small muted">{t.rec.title}</div></td>
          <td><Badge tone="navy">{t.kind}</Badge></td>
          <td><div className="strong">{t.title}</div><div className="small muted">{t.detail}</div>{t.urgency === 'overdue' && <Badge tone="red">Overdue</Badge>}</td>
          <td><Mini rec={t.rec} /><div className="small muted mt-s">{t.rec.status}</div></td>
          <td style={{ textAlign: 'right' }}><Button sm variant="primary">Open</Button></td></tr>))}</tbody></table></div>
  );
}

// ---- derived header notifications: pending tasks + one-week due-date reminders
export function notificationsFor(records, tasks, ctx) {
  const out = tasks.map((t) => ({ title: t.title, number: label(t.rec), detail: t.detail, recId: t.rec.id, tab: t.tab, actionId: t.actionId }));
  records.filter((r) => E.canViewRecord(r, ctx.user) && !E.isFinal(r)).forEach((r) => {
    const mineInit = r.initiatorId === ctx.user.id || hasRole(ctx.user, 'qa_designee');
    const dd = r.dueDate && daysFrom(r.dueDate, ctx.now);
    if (mineInit && dd !== null && dd !== false && dd >= 0 && dd <= 7 && r.status === S.IMPL) out.push({ reminder: true, title: `CC due in ${dd} day(s)`, number: label(r), detail: `Overall due date ${fmtDate(r.dueDate)} – complete verification and closeout, or request an extension.`, recId: r.id });
    r.actions.forEach((a) => { const d = a.due && daysFrom(a.due, ctx.now); if (a.ownerId === ctx.user.id && a.status !== 'Completed' && a.status !== 'Planned' && d !== null && d >= 0 && d <= 7) out.push({ reminder: true, title: `Action ${a.id} due in ${d} day(s)`, number: label(r), detail: a.description, recId: r.id, tab: 'actions', actionId: a.id }); });
  });
  return out;
}

export function Dashboard({ ctx, records, tasks, open, go }) {
  const u = ctx.user;
  const vis = records.filter((r) => E.canViewRecord(r, u));
  const active = vis.filter((r) => !E.isFinal(r));
  const mine = active.filter((r) => r.initiatorId === u.id);
  const dueSoon = vis.flatMap((r) => [...(r.dueDate && !E.isFinal(r) && r.status === S.IMPL && (r.initiatorId === u.id || hasRole(u, 'qa_designee', 'ceo')) ? [{ r }] : []), ...r.actions.filter((a) => a.ownerId === u.id && a.status !== 'Completed' && a.status !== 'Planned' && a.due).map((a) => ({ r, a }))]).filter((x) => { const d = daysFrom(x.a ? x.a.due : x.r.dueDate, ctx.now); return d !== null && d >= 0 && d <= 7; });
  const first = u.name.replace('Dr. ', '').split(' ')[0];
  const site = hasRole(u, 'qa_designee', 'ceo');
  const hod = hasRole(u, 'hod');
  const dept = active.filter((r) => r.department === u.dept || E.deptHead(r)?.id === u.id);
  const byStage = STAGES.map((s) => ({ ...s, n2: active.filter((r) => E.stageOf(r) === s.n).length })); const max = Math.max(1, ...byStage.map((s) => s.n2));
  const od = vis.flatMap((r) => r.actions.filter((a) => E.isOverdue(a, ctx.now)));
  if (hasRole(u, 'admin') && !hasRole(u, 'employee', 'hod', 'qa_designee', 'ceo')) return (
    <><PageHead title={`Welcome, ${first}`} sub="System Administrator" />
      <div className="grid g3 mb"><div className="card kpi"><div className="l">Change Controls (count only)</div><div className="v">{records.length}</div></div><div className="card kpi"><div className="l">Audit events</div><div className="v">{records.reduce((n, r) => n + r.history.length, 0)}</div></div><div className="card kpi"><div className="l">Users</div><div className="v">17</div></div></div>
      <Card title="Administrator access"><div className="row"><Button onClick={() => go('/admin')}>Administration</Button><Button onClick={() => go('/audit')}>Audit Trail</Button></div><div className="small muted mt">The System Administrator manages users, roles, settings and the system-wide audit trail; Change Control content is not shown here.</div></Card></>);
  return (
    <>
      <PageHead title={`Welcome, ${first}`} sub={`${u.title} · ${u.dept}`} right={hasRole(u, 'employee', 'hod', 'ra_designee', 'qa_designee') && <Button variant="primary" icon={Plus} onClick={() => go('/create')}>Create Change Control</Button>} />
      <div className="grid g3 mb">
        <div className="card kpi"><div className="l">My tasks</div><div className="v">{tasks.length}</div><div className="s">waiting for you</div></div>
        <div className="card kpi"><div className="l">{site ? 'Open Change Controls (site)' : 'My open Change Controls'}</div><div className="v">{site ? active.length : mine.length}</div><div className="s">{site ? 'all departments' : 'initiated by me'}</div></div>
        <div className="card kpi"><div className="l">Due soon</div><div className="v" style={{ color: dueSoon.length ? 'var(--warn)' : undefined }}>{dueSoon.length}</div><div className="s">due within 7 days</div></div>
      </div>
      <div className="col" style={{ gap: 16 }}>
        <Card title="Pending tasks" sub="Everything that needs your action" right={tasks.length > 8 && <Button sm variant="ghost" onClick={() => go('/tasks')}>View all</Button>} pad={false}><TaskTable tasks={tasks} open={open} limit={8} /></Card>
        {hod && !site && <Card title={`Department activity – ${u.dept}`} sub="Open Change Controls in your department" pad={false}>
          {dept.length ? <table className="t"><thead><tr><th>Change Control</th><th>Status</th><th>Waiting on</th><th>Due</th></tr></thead><tbody>{dept.map((r) => <tr key={r.id} className="click" onClick={() => open(r.id)}><td><span className="cc-no">{label(r)}</span><div className="small muted">{r.title}</div></td><td><StatusBadge status={r.status} /></td><td className="small">{E.waitingOn(r)}</td><td>{r.dueDate ? fmtDate(r.dueDate) : '—'}</td></tr>)}</tbody></table> : <Empty>No open Change Controls in your department.</Empty>}</Card>}
        {site && <Card title="Site-wide status" sub={`Open Change Controls by stage · ${od.length} overdue action(s)`}>{byStage.map((s) => <div key={s.n} style={{ marginBottom: 10 }}><div className="row between small"><span>{s.n}. {s.name}</span><b>{s.n2}</b></div><div className="bar"><i style={{ width: `${(s.n2 / max) * 100}%` }} /></div></div>)}</Card>}
      </div>
    </>
  );
}

export function Register({ records, ctx, open, perform }) {
  const [q, setQ] = useState(''); const [view, setView] = useState('open'); const [st, setSt] = useState('All'); const [quick, setQuick] = useState(null); const [modal, setModal] = useState(null);
  const vis = records.filter((r) => E.canViewRecord(r, ctx.user));
  const list = vis.filter((r) => (view === 'all' || (view === 'open' ? !E.isFinal(r) : E.isFinal(r))) && (st === 'All' || r.status === st) && (!q || (label(r) + ' ' + r.title).toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHead title="Change Controls" sub="Search by CC number or title keywords; open requests are shown first" />
      <Card pad={false}>
        <div className="row wrap" style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="grow" style={{ position: 'relative', minWidth: 260 }}><Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} /><Input style={{ paddingLeft: 32 }} placeholder="CC number or title keywords" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="seg">{[['open', 'Open'], ['final', 'Closed / stopped'], ['all', 'All']].map(([k, l]) => <button key={k} className={view === k ? 'on' : ''} onClick={() => setView(k)}>{l}</button>)}</div>
          <Select style={{ width: 240 }} value={st} onChange={(e) => setSt(e.target.value)}><option>All</option>{Object.values(S).map((s) => <option key={s}>{s}</option>)}</Select>
        </div>
        <div className="table-wrap"><table className="t"><thead><tr><th>Number</th><th>Title</th><th>Initiator</th><th>Progress</th><th>Status</th><th>Due</th><th></th></tr></thead>
          <tbody>{list.map((r) => { const p = E.perms(r, ctx); return (
            <tr key={r.id} className="click" onClick={() => open(r.id)}>
              <td className="cc-no">{label(r)}</td><td style={{ maxWidth: 300 }}>{r.title}</td><td>{r.initiatorName}<div className="small muted">{r.department}</div></td><td><Mini rec={r} /></td><td><StatusBadge status={r.status} /></td>
              <td>{r.dueDate ? <>{fmtDate(r.dueDate)}{!E.isFinal(r) && <div><DueChip date={r.dueDate} /></div>}</> : '—'}</td>
              <td onClick={(e) => e.stopPropagation()}><div className="row">
                <button className="btn ghost sm" title="Quick view" onClick={() => setQuick(r)}><Info size={16} /></button>
                {p.requestExtension && <Button sm onClick={() => setModal({ r, k: 'ext' })}>Extension</Button>}
                {p.requestAmendment && <Button sm onClick={() => setModal({ r, k: 'amd' })}>Amendment</Button>}</div></td></tr>); })}</tbody></table></div>
        {!list.length && <Empty>No Change Controls match.</Empty>}
      </Card>
      {quick && <Modal title={label(quick)} sub={quick.title} onClose={() => setQuick(null)} footer={<><Button onClick={() => setQuick(null)}>Close</Button><Button variant="primary" onClick={() => open(quick.id)}>Open Change Control</Button></>}>
        <dl className="kv" style={{ gridTemplateColumns: '150px 1fr' }}><dt>Status</dt><dd><StatusBadge status={quick.status} /></dd><dt>Waiting on</dt><dd>{E.isFinal(quick) ? '—' : E.waitingOn(quick)}</dd><dt>Initiator</dt><dd>{quick.initiatorName} · {quick.department}</dd><dt>Stage</dt><dd><Mini rec={quick} /></dd><dt>Overall due date</dt><dd>{quick.dueDate ? fmtDate(quick.dueDate) : '—'}</dd><dt>Changes</dt><dd>{quick.changes.length} row(s)</dd><dt>Actions</dt><dd>{quick.actions.filter((a) => a.status === 'Completed').length} of {quick.actions.length} completed</dd></dl>
        <div className="small"><b>Latest activity</b>{quick.history.slice(-3).reverse().map((h) => <div key={h.id} className="muted">{fmtDateTime(h.at)} · {h.action}</div>)}</div></Modal>}
      {modal?.k === 'ext' && <ExtensionModal rec={modal.r} perform={perform} onClose={() => setModal(null)} />}
      {modal?.k === 'amd' && <AmendmentModal rec={modal.r} perform={perform} onClose={() => setModal(null)} />}
    </>
  );
}

// Reports: HOD = department scope; QA Designee / CEO = site-wide. Search by CC number; interim report any time, final dossier after closure.
export function Reports({ records, ctx, open }) {
  const [q, setQ] = useState('');
  const u = ctx.user;
  const site = hasRole(u, 'qa_designee', 'ceo');
  const scope = records.filter((r) => E.canViewRecord(r, u) && (site || r.department === u.dept || E.deptHead(r)?.id === u.id || isQadHod(u)));
  const list = scope.filter((r) => !q || (label(r) + r.title).toLowerCase().includes(q.toLowerCase()));
  const od = scope.flatMap((r) => r.actions.filter((a) => E.isOverdue(a, ctx.now)).map((a) => ({ r, a })));
  const active = scope.filter((r) => !E.isFinal(r));
  const byStage = STAGES.map((s) => ({ ...s, n2: active.filter((r) => E.stageOf(r) === s.n).length })); const max = Math.max(1, ...byStage.map((s) => s.n2));
  return (
    <>
      <PageHead title="Reports" sub={site ? 'Site-wide scope' : `Department scope – ${u.dept}`} right={<Button icon={Download} onClick={() => downloadCSV('change-control-register.csv', [['CC number', 'Title', 'Department', 'Initiator', 'Status', 'Date requested', 'Due date'], ...scope.map((r) => [label(r), r.title, r.department, r.initiatorName, r.status, r.dateRequested, r.dueDate || ''])])}>Export register (CSV)</Button>} />
      <div className="grid g3 mb"><div className="card kpi"><div className="l">Change Controls in scope</div><div className="v">{scope.length}</div></div><div className="card kpi"><div className="l">Open</div><div className="v">{active.length}</div></div><div className="card kpi"><div className="l">Overdue actions</div><div className="v" style={{ color: od.length ? 'var(--danger)' : undefined }}>{od.length}</div></div></div>
      <Card title="Change Control reports" sub="Interim report (any time) · Final dossier (closed Change Controls, with attachments, decisions and signatures)" pad={false}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}><Input placeholder="Search by CC number or title" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <table className="t"><thead><tr><th>CC number</th><th>Title</th><th>Status</th><th>Reports</th></tr></thead>
          <tbody>{list.map((r) => <tr key={r.id}><td className="cc-no">{label(r)}</td><td>{r.title}<div className="small muted">{r.department}</div></td><td><StatusBadge status={r.status} /></td>
            <td><div className="row"><Button sm icon={FileDown} onClick={() => downloadReport(r, 'interim')}>Interim report</Button><Button sm icon={FileDown} variant={r.status === S.CLOSED ? 'primary' : ''} disabled={r.status !== S.CLOSED} onClick={() => downloadReport(r, 'final')}>Final dossier</Button><Button sm variant="ghost" onClick={() => open(r.id)}>Open</Button></div></td></tr>)}</tbody></table>
        {!list.length && <Empty>No Change Controls match.</Empty>}
      </Card>
      <div className="grid g2 mt"><Card title="Open by stage">{byStage.map((s) => <div key={s.n} style={{ marginBottom: 10 }}><div className="row between small"><span>{s.n}. {s.name}</span><b>{s.n2}</b></div><div className="bar"><i style={{ width: `${(s.n2 / max) * 100}%` }} /></div></div>)}</Card>
        <Card title="Overdue actions">{od.length ? od.map(({ r, a }) => <div key={r.id + a.id} className="qrow" style={{ cursor: 'pointer' }} onClick={() => open(r.id, 'actions', a.id)}><span><b>{label(r)}</b> · {a.id} {a.description}<div className="help">{userById(a.ownerId)?.name} · due {fmtDate(a.due)}</div></span><Badge tone="red">{-daysFrom(a.due, ctx.now)} d</Badge></div>) : <Empty>No overdue actions.</Empty>}</Card></div>
    </>
  );
}

// System-wide audit trail – System Admin only
export function AuditPage({ records, admin }) {
  const [q, setQ] = useState('');
  const ev = useMemo(() => [...records.flatMap((r) => r.history.map((h) => ({ ...h, cc: label(r) }))), ...admin.map((a) => ({ ...a, cc: 'System', role: 'System Admin', detail: a.detail }))].sort((a, b) => (a.at < b.at ? 1 : -1)), [records, admin]);
  const list = ev.filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase())).slice(0, 300);
  return (
    <>
      <PageHead title="Audit Trail" sub="System-wide record of every event (System Admin only; authorized users see each CC's Activity History inside the Change Control)" right={<Button icon={Download} onClick={() => downloadCSV('audit-trail.csv', [['Date/time', 'Change Control', 'User', 'Role', 'Event', 'Detail', 'E-signature'], ...ev.map((e) => [e.at, e.cc, e.actor, e.role, e.action, e.detail, e.signature?.meaning || ''])])}>Export CSV</Button>} />
      <Card pad={false}><div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}><Input placeholder="Filter by user, Change Control or event" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="table-wrap"><table className="t"><thead><tr><th>Date / time</th><th>Change Control</th><th>User</th><th>Event</th><th>E-signature</th></tr></thead>
          <tbody>{list.map((e) => <tr key={e.id}><td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.at)}</td><td className="cc-no">{e.cc}</td><td>{e.actor}<div className="small muted">{e.role}</div></td><td><b>{e.action}</b><div className="small muted">{e.detail}</div></td><td>{e.signature ? <Badge tone="orange">{e.signature.meaning}</Badge> : '—'}</td></tr>)}</tbody></table></div></Card>
    </>
  );
}
