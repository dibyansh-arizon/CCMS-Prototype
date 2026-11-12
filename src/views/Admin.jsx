import React, { useState } from 'react';
import { Plus, RotateCcw, Lock } from 'lucide-react';
import { Button, Card, Badge, Field, Input, Select, PageHead, Banner } from '../ui.jsx';
import { ASSESSMENTS } from '../data/forms.js';
import { USERS, ROLES, userById } from '../data/people.js';
import { fmtDate } from '../util.js';

export default function Admin({ ctx, db, setDb, onReset, toast }) {
  const [tab, setTab] = useState('users');
  const isAdmin = ctx.user.roleId === 'admin';
  const [d, setD] = useState({ fromId: '', toId: '', start: '', end: '', reason: '' });
  const addDel = () => {
    if (!d.fromId || !d.toId || !d.start || !d.end) return toast('Complete all delegation fields.', 'error');
    if (d.fromId === d.toId) return toast('Choose two different people.', 'error');
    setDb((x) => ({ ...x, delegations: [...x.delegations, { id: `DEL-${x.delegations.length + 1}`, ...d, status: 'Active' }], admin: [...x.admin, { id: 'ad-' + Date.now(), at: new Date().toISOString(), actor: ctx.user.name, action: 'Delegation created', detail: `${userById(d.fromId).name} → ${userById(d.toId).name} (${d.start} to ${d.end})` }] }));
    setD({ fromId: '', toId: '', start: '', end: '', reason: '' }); toast('Delegation created and audited.');
  };
  return (
    <>
      <PageHead title="Administration" sub="Users, department checklists, delegations and system settings" />
      {!isAdmin && <div className="mb"><Banner tone="info" icon={Lock}>View only. Changes are made by the System Administrator.</Banner></div>}
      <div className="card"><div className="tabs">{[['users', 'Users & roles'], ['lists', 'Assessment checklists'], ['del', 'Delegations'], ['set', 'Settings']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="card-b">
          {tab === 'users' && <table className="t"><thead><tr><th>Name</th><th>Role</th><th>Department</th><th>Title</th></tr></thead><tbody>{USERS.map((u) => <tr key={u.id}><td className="strong">{u.name}</td><td><Badge tone="navy">{ROLES[u.roleId].label}</Badge></td><td>{u.dept}</td><td>{u.title}</td></tr>)}</tbody></table>}
          {tab === 'lists' && (
            <div className="col">
              <Banner tone="info">These are the exact QAD003.04 questions. Each department head is shown only their own checklist during Stage 3.</Banner>
              <div className="grid g2">{ASSESSMENTS.map((a) => (
                <div key={a.key} className="acard"><h3>{a.name}</h3><div className="small muted">{a.completedBy}</div>
                  <div className="qa">{a.fields.map((f) => <div key={f.id}><span>{f.label}</span><b className="small">{f.options ? f.options.join(' · ') : f.type === 'yn' ? 'Yes · No' : 'Yes · No · Not Applicable'}</b></div>)}</div></div>))}</div>
            </div>
          )}
          {tab === 'del' && (
            <div className="col">
              <table className="t"><thead><tr><th>From</th><th>Delegate</th><th>Period</th><th>Reason</th><th>Status</th><th></th></tr></thead>
                <tbody>{db.delegations.map((x) => <tr key={x.id}><td>{userById(x.fromId)?.name}</td><td>{userById(x.toId)?.name}</td><td>{fmtDate(x.start)} – {fmtDate(x.end)}</td><td>{x.reason}</td><td><Badge tone={x.status === 'Active' ? 'green' : ''}>{x.status}</Badge></td>
                  <td>{isAdmin && x.status === 'Active' && <Button sm onClick={() => setDb((s) => ({ ...s, delegations: s.delegations.map((y) => (y.id === x.id ? { ...y, status: 'Revoked' } : y)) }))}>Revoke</Button>}</td></tr>)}</tbody></table>
              {isAdmin && (
                <div className="card pad" style={{ background: '#fafbfd' }}><div className="section-t">New delegation (time-bound, audited)</div>
                  <div className="grid g4">
                    <Field label="Delegator"><Select value={d.fromId} onChange={(e) => setD({ ...d, fromId: e.target.value })}><option value="">Select…</option>{USERS.filter((u) => !['admin', 'auditor'].includes(u.roleId)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
                    <Field label="Delegate"><Select value={d.toId} onChange={(e) => setD({ ...d, toId: e.target.value })}><option value="">Select…</option>{USERS.filter((u) => !['admin', 'auditor'].includes(u.roleId)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field>
                    <Field label="From"><Input type="date" value={d.start} onChange={(e) => setD({ ...d, start: e.target.value })} /></Field>
                    <Field label="Until"><Input type="date" value={d.end} onChange={(e) => setD({ ...d, end: e.target.value })} /></Field>
                  </div>
                  <div className="row mt"><div className="grow"><Input placeholder="Reason" value={d.reason} onChange={(e) => setD({ ...d, reason: e.target.value })} /></div><Button variant="primary" icon={Plus} onClick={addDel}>Create delegation</Button></div></div>
              )}
            </div>
          )}
          {tab === 'set' && (
            <div className="col" style={{ maxWidth: 640 }}>
              <Field label="Client approval gate" help="The Master Workflow leaves this timing open. Default follows the QAD form order (client review before QA final approval).">
                <Select disabled={!isAdmin} value={db.settings.clientGate} onChange={(e) => setDb((x) => ({ ...x, settings: { ...x.settings, clientGate: e.target.value } }))}>
                  <option value="before_approval">Required before QA final approval (recommended)</option><option value="implementation">Treated as an implementation action</option></Select></Field>
              <Field label="Default Change Control due date"><Input readOnly value="60 days from QA final approval (QA can select a later date, never earlier than the latest action)" /></Field>
              {isAdmin && <div><Button variant="danger" icon={RotateCcw} onClick={onReset}>Reset demo data</Button></div>}
            </div>
          )}
        </div></div>
    </>
  );
}
