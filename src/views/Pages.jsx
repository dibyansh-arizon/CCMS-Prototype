import React, { useMemo, useState } from 'react';
import { Download, Search, Plus, ArrowRight } from 'lucide-react';
import * as E from '../engine.js';
import { Badge, StatusBadge, Button, Card, Field, Input, Select, PageHead, Empty, Banner, Avatar, ACTION_TONE } from '../ui.jsx';
import { STAGES, STATUS as S, EXTENSION_LEVELS } from '../data/forms.js';
import { DEPARTMENTS, userById } from '../data/people.js';
import { fmtDate, fmtDateTime, downloadCSV, daysFrom, cx } from '../util.js';
import { DueChip } from './Workspace.jsx';

const MiniStage = ({ rec }) => {
  const c = E.stageOf(rec);
  return <div className="mini-stage" title={`Stage ${Math.min(c, 8)} of 8`}>{STAGES.map((s) => <i key={s.n} className={c > 8 || s.n < c ? 'on' : s.n === c ? 'cur' : ''} />)}</div>;
};
const ccLabel = (r) => r.ccNumber || r.draftId;

export function TaskTable({ tasks, open, limit }) {
  const list = limit ? tasks.slice(0, limit) : tasks;
  if (!list.length) return <Empty>Nothing is waiting for you right now.</Empty>;
  return (
    <div className="table-wrap"><table className="t">
      <thead><tr><th>Change Control</th><th>Your task</th><th>Stage</th><th></th></tr></thead>
      <tbody>{list.map((t, i) => (
        <tr key={i} className="click" onClick={() => open(t.rec.id)}>
          <td><div className="cc-no">{ccLabel(t.rec)}</div><div className="small muted">{t.rec.title}</div></td>
          <td><div className="strong">{t.title}</div>{t.detail && <div className="small muted">{t.detail}</div>}{t.urgency === 'overdue' && <Badge tone="red">Overdue</Badge>}</td>
          <td><MiniStage rec={t.rec} /><div className="small muted mt-s">{t.rec.status}</div></td>
          <td style={{ textAlign: 'right' }}><Button sm variant="primary">Open</Button></td>
        </tr>))}</tbody>
    </table></div>
  );
}

export function Dashboard({ ctx, records, tasks, open, go }) {
  const active = records.filter((r) => !E.isFinal(r));
  const myActs = records.flatMap((r) => r.actions.filter((a) => E.canWorkOnAction(r, a, ctx) && a.status !== 'Completed').map((a) => ({ r, a })));
  const overdueAll = records.flatMap((r) => (r.status === S.IMPL ? r.actions.filter((a) => E.isOverdue(a)) : []));
  const events = records.flatMap((r) => r.history.map((h) => ({ ...h, cc: ccLabel(r), rid: r.id }))).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 8);
  const byStage = STAGES.map((s) => ({ ...s, n2: active.filter((r) => E.stageOf(r) === s.n).length }));
  const max = Math.max(1, ...byStage.map((s) => s.n2));
  return (
    <>
      <PageHead title={`Welcome, ${ctx.user.name.split(' ')[0] === 'Dr.' ? ctx.user.name.split(' ')[1] : ctx.user.name.split(' ')[0]}`} sub={`${ctx.user.title} · ${ctx.user.dept}`}
        right={ctx.user.roleId === 'initiator' && <Button variant="primary" icon={Plus} onClick={() => go('/create')}>Create Change Control</Button>} />
      <div className="grid g4 mb">
        <div className="card kpi"><div className="l">My tasks</div><div className="v">{tasks.length}</div><div className="s">waiting for you</div></div>
        <div className="card kpi"><div className="l">Open Change Controls</div><div className="v">{active.length}</div><div className="s">across all stages</div></div>
        <div className="card kpi"><div className="l">My open actions</div><div className="v">{myActs.length}</div><div className="s">{myActs.filter(({ a }) => E.isOverdue(a)).length} overdue</div></div>
        <div className="card kpi"><div className="l">Overdue actions (site)</div><div className="v" style={{ color: overdueAll.length ? 'var(--danger)' : undefined }}>{overdueAll.length}</div><div className="s">in implementation</div></div>
      </div>
      <div className="grid g-main">
        <Card title="My tasks" sub="Everything that needs your action, by Change Control" right={tasks.length > 6 && <Button sm variant="ghost" onClick={() => go('/tasks')}>View all</Button>} pad={false}>
          <TaskTable tasks={tasks} open={open} limit={6} />
        </Card>
        <div className="col" style={{ gap: 16 }}>
          <Card title="Workflow overview" sub="Open Change Controls by stage">
            {byStage.map((s) => <div key={s.n} style={{ marginBottom: 10 }}><div className="row between small"><span>{s.n}. {s.name}</span><b>{s.n2}</b></div><div className="bar"><i style={{ width: `${(s.n2 / max) * 100}%` }} /></div></div>)}
          </Card>
          <Card title="Recent activity">
            {events.map((e) => <div key={e.id} className="small" style={{ padding: '6px 0', borderBottom: '1px solid var(--line)', cursor: 'pointer' }} onClick={() => open(e.rid)}><b>{e.cc}</b> · {e.action}<div className="muted">{e.actor} · {fmtDateTime(e.at)}</div></div>)}
          </Card>
        </div>
      </div>
    </>
  );
}

export function Register({ records, open, ctx }) {
  const [q, setQ] = useState(''); const [st, setSt] = useState('All'); const [dp, setDp] = useState('All'); const [ty, setTy] = useState('All');
  const types = [...new Set(records.map((r) => r.type).filter(Boolean))];
  const list = records.filter((r) => (st === 'All' || r.status === st) && (dp === 'All' || r.department === dp) && (ty === 'All' || r.type === ty) && (!q || (ccLabel(r) + r.title + r.initiatorName).toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHead title="Change Controls" sub="All Change Control records you are permitted to view" />
      <Card pad={false}>
        <div className="row wrap" style={{ padding: 14, borderBottom: '1px solid var(--line)' }}>
          <div className="grow" style={{ position: 'relative', minWidth: 240 }}><Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} /><Input style={{ paddingLeft: 32 }} placeholder="Search by number, title or initiator" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <Select style={{ width: 230 }} value={st} onChange={(e) => setSt(e.target.value)}><option>All</option>{Object.values(S).map((s) => <option key={s}>{s}</option>)}</Select>
          <Select style={{ width: 190 }} value={dp} onChange={(e) => setDp(e.target.value)}><option>All</option>{DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}</Select>
          <Select style={{ width: 190 }} value={ty} onChange={(e) => setTy(e.target.value)}><option>All</option>{types.map((d) => <option key={d}>{d}</option>)}</Select>
        </div>
        <div className="table-wrap"><table className="t">
          <thead><tr><th>Number</th><th>Title</th><th>Type</th><th>Initiator</th><th>Progress</th><th>Status</th><th>Due</th><th>Waiting on</th></tr></thead>
          <tbody>{list.map((r) => (
            <tr key={r.id} className="click" onClick={() => open(r.id)}>
              <td className="cc-no">{ccLabel(r)}</td><td style={{ maxWidth: 320 }}>{r.title}</td><td>{r.type === 'Other' ? r.otherType : r.type}</td>
              <td>{r.initiatorName}<div className="small muted">{r.department}</div></td><td><MiniStage rec={r} /></td><td><StatusBadge status={r.status} /></td>
              <td>{r.dueDate ? <>{fmtDate(r.dueDate)}{!E.isFinal(r) && <div><DueChip date={r.dueDate} /></div>}</> : '—'}</td><td className="small">{E.isFinal(r) ? '—' : E.waitingOn(r)}</td>
            </tr>))}</tbody>
        </table></div>
        {!list.length && <Empty>No Change Controls match the filters.</Empty>}
      </Card>
    </>
  );
}

export function Logbook({ records, open }) {
  const rows = records.filter((r) => r.ccNumber);
  const exp = () => downloadCSV('change-control-logbook.csv', [['CC number', 'Department', 'Date requested', 'Requested by', 'Title', 'Issued by', 'Issued on', 'Date completed', 'Status'], ...rows.map((r) => [r.ccNumber, r.department, r.dateRequested, r.initiatorName, r.title, r.issuedBy, r.issuedAt?.slice(0, 10), r.closedAt?.slice(0, 10) || '', r.status])]);
  return (
    <>
      <PageHead title="Change Control Logbook" sub="Generated automatically when QA issues each official CC number" right={<Button icon={Download} onClick={exp}>Export CSV</Button>} />
      <Card pad={false}><div className="table-wrap"><table className="t">
        <thead><tr><th>CC number</th><th>Department</th><th>Date requested</th><th>Requested by</th><th>Title</th><th>Issued by / date</th><th>Date completed</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.id} className="click" onClick={() => open(r.id)}><td className="cc-no">{r.ccNumber}</td><td>{r.department}</td><td>{fmtDate(r.dateRequested)}</td><td>{r.initiatorName}</td><td>{r.title}</td><td>{r.issuedBy}<div className="small muted">{fmtDate(r.issuedAt)}</div></td><td>{r.closedAt ? fmtDate(r.closedAt) : <span className="muted">Open</span>}</td></tr>)}</tbody>
      </table></div></Card>
    </>
  );
}

export function ExtensionsPage({ records, ctx, open }) {
  const rows = records.flatMap((r) => r.extensions.map((e) => ({ r, e })));
  return (
    <>
      <PageHead title="Extension Requests" sub="Requests for more time, routed through the review and approval chain for each extension level" />
      <Card pad={false}>
        {!rows.length ? <Empty>No extension requests yet. Initiators request them from an active Change Control.</Empty> : (
          <div className="table-wrap"><table className="t"><thead><tr><th>Change Control</th><th>Extension</th><th>Reason</th><th>Route</th><th>Status</th><th></th></tr></thead>
            <tbody>{rows.map(({ r, e }) => (
              <tr key={r.id + e.id}><td><div className="cc-no">{r.ccNumber}</div><div className="small muted">{r.title}</div></td><td>{EXTENSION_LEVELS[e.level - 1].label}<div className="small muted">Requested by {e.requestedBy}, {fmtDate(e.requestedAt)}</div></td><td>{e.reason}</td>
                <td className="small">{e.chain.map((s, i) => <div key={i}>{s.done ? '✓' : i === e.step && e.status === 'Pending' ? '▶' : '○'} {s.type === 'review' ? 'Review' : 'Approve'}: {s.label}</div>)}</td>
                <td><Badge tone={e.status === 'Approved' ? 'green' : e.status === 'Rejected' ? 'red' : 'orange'}>{e.status}</Badge></td>
                <td><Button sm variant={E.extensionActor(r, e, ctx) ? 'primary' : ''} onClick={() => open(r.id)}>{E.extensionActor(r, e, ctx) ? 'Decide' : 'Open'}</Button></td></tr>))}</tbody></table></div>
        )}
      </Card>
    </>
  );
}
export function AmendmentsPage({ records, ctx, open }) {
  const rows = records.flatMap((r) => r.amendments.map((a) => ({ r, a })));
  return (
    <>
      <PageHead title="Amendments" sub="Additional actions discovered after QA final approval – each needs QA authorization" />
      <Card pad={false}>
        {!rows.length ? <Empty>No amendment requests yet.</Empty> : (
          <div className="table-wrap"><table className="t"><thead><tr><th>Change Control</th><th>Amendment</th><th>Proposed owner / due</th><th>Status</th><th></th></tr></thead>
            <tbody>{rows.map(({ r, a }) => <tr key={r.id + a.id}><td><div className="cc-no">{r.ccNumber}</div><div className="small muted">{r.title}</div></td><td>{a.description}<div className="small muted">{a.reason} · by {a.requestedBy}, {fmtDate(a.requestedAt)}</div></td><td>{userById(a.ownerId)?.name}<div className="small muted">due {fmtDate(a.due)}</div></td><td><Badge tone={a.status === 'Authorized' ? 'green' : a.status === 'Declined' ? 'red' : 'orange'}>{a.status}</Badge></td><td><Button sm variant={a.status === 'Pending' && E.perms(r, ctx).decideAmendment ? 'primary' : ''} onClick={() => open(r.id)}>{a.status === 'Pending' && E.perms(r, ctx).decideAmendment ? 'Decide' : 'Open'}</Button></td></tr>)}</tbody></table></div>
        )}
      </Card>
    </>
  );
}

export function Reports({ records, open }) {
  const [tab, setTab] = useState('stage');
  const active = records.filter((r) => !E.isFinal(r));
  const overdue = records.flatMap((r) => (r.status === S.IMPL ? r.actions.filter((a) => E.isOverdue(a)).map((a) => ({ r, a })) : []));
  const counts = Object.values(S).map((s) => ({ s, n: records.filter((r) => r.status === s).length })).filter((x) => x.n);
  const closed = records.filter((r) => r.closedAt && r.issuedAt);
  const avg = closed.length ? Math.round(closed.reduce((t, r) => t + (new Date(r.closedAt) - new Date(r.issuedAt)) / 86400000, 0) / closed.length) : 0;
  const max = Math.max(1, ...STAGES.map((s) => active.filter((r) => E.stageOf(r) === s.n).length));
  return (
    <>
      <PageHead title="Reports and Analytics" sub="Live reports from the Change Control register" />
      <div className="card"><div className="tabs">{[['stage', 'Open by stage'], ['over', `Overdue actions (${overdue.length})`], ['status', 'Status summary']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="card-b">
          {tab === 'stage' && STAGES.map((s) => { const l = active.filter((r) => E.stageOf(r) === s.n); return <div key={s.n} style={{ marginBottom: 14 }}><div className="row between"><b>{s.n}. {s.name}</b><span>{l.length}</span></div><div className="bar"><i style={{ width: `${(l.length / max) * 100}%` }} /></div><div className="small muted mt-s">{l.map((r) => <a key={r.id} onClick={() => open(r.id)} style={{ marginRight: 12 }}>{ccLabel(r)}</a>)}</div></div>; })}
          {tab === 'over' && (overdue.length ? <table className="t"><thead><tr><th>Change Control</th><th>Action</th><th>Owner</th><th>Due</th><th>Late by</th></tr></thead><tbody>{overdue.map(({ r, a }) => <tr key={r.id + a.id} className="click" onClick={() => open(r.id)}><td className="cc-no">{r.ccNumber}</td><td>{a.id} · {a.description}</td><td>{userById(a.ownerId)?.name}</td><td>{fmtDate(a.due)}</td><td><Badge tone="red">{-daysFrom(a.due)} days</Badge></td></tr>)}</tbody></table> : <Empty>No overdue actions.</Empty>)}
          {tab === 'status' && <div className="grid g3">{counts.map((c) => <div key={c.s} className="card kpi"><div className="l">{c.s}</div><div className="v">{c.n}</div></div>)}<div className="card kpi"><div className="l">Average cycle time</div><div className="v">{avg} d</div><div className="s">issue to closure ({closed.length} closed)</div></div></div>}
        </div></div>
    </>
  );
}

export function AuditPage({ records, admin }) {
  const [q, setQ] = useState('');
  const ev = useMemo(() => [...records.flatMap((r) => r.history.map((h) => ({ ...h, cc: ccLabel(r) }))), ...admin.map((a) => ({ ...a, cc: 'System', role: 'Administrator', actor: a.actor, detail: a.detail }))].sort((a, b) => (a.at < b.at ? 1 : -1)), [records, admin]);
  const list = ev.filter((e) => !q || JSON.stringify(e).toLowerCase().includes(q.toLowerCase())).slice(0, 300);
  return (
    <>
      <PageHead title="Audit Trail" sub="Secure, time-stamped record of every event across all Change Controls (read-only)" right={<Button icon={Download} onClick={() => downloadCSV('audit-trail.csv', [['Date/time', 'Change Control', 'User', 'Role', 'Event', 'Detail', 'E-signature'], ...ev.map((e) => [e.at, e.cc, e.actor, e.role, e.action, e.detail, e.signature?.meaning || ''])])}>Export CSV</Button>} />
      <Card pad={false}>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line)' }}><Input placeholder="Filter by user, Change Control or event" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="table-wrap"><table className="t"><thead><tr><th>Date / time</th><th>Change Control</th><th>User</th><th>Event</th><th>E-signature</th></tr></thead>
          <tbody>{list.map((e) => <tr key={e.id}><td className="mono" style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.at)}</td><td className="cc-no">{e.cc}</td><td>{e.actor}<div className="small muted">{e.role}</div></td><td><b>{e.action}</b><div className="small muted">{e.detail}</div></td><td>{e.signature ? <Badge tone="orange">{e.signature.meaning}</Badge> : '—'}</td></tr>)}</tbody></table></div>
      </Card>
    </>
  );
}
