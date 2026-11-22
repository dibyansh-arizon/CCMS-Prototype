import React, { useState } from 'react';
import { RotateCcw, FileText } from 'lucide-react';
import { Button, Card, Badge, Field, Select, PageHead, Banner } from '../ui.jsx';
import { ASSESSMENTS, OPEN_DECISIONS, VERSION } from '../data/forms.js';
import { USERS, ROLES, roleLabel } from '../data/people.js';

export default function Admin({ db, setDb, onReset }) {
  const [tab, setTab] = useState('users');
  return (
    <>
      <PageHead title="Administration" sub="Users and roles, checklists, settings, open decisions and version information" />
      <div className="card"><div className="tabs">{[['users', 'Users & roles'], ['lists', 'Assessment checklists'], ['set', 'Settings'], ['open', `Open decisions (${OPEN_DECISIONS.length})`], ['about', 'Version & source']].map(([k, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>
        <div className="card-b">
          {tab === 'users' && <><Banner tone="info">One account may hold several roles; menus and permissions are the union of its roles.</Banner><table className="t mt"><thead><tr><th>Name</th><th>Role(s)</th><th>Department</th><th>Title</th></tr></thead><tbody>{USERS.map((u) => <tr key={u.id}><td className="strong">{u.name}</td><td>{u.roles.map((r) => <Badge key={r} tone="navy">{ROLES[r].label}</Badge>)}</td><td>{u.dept}</td><td>{u.title}</td></tr>)}</tbody></table></>}
          {tab === 'lists' && <div className="grid g2">{ASSESSMENTS.map((a) => <div key={a.key} className="acard"><h3>{a.name}</h3><div className="small muted">{a.completedBy}</div><div className="qa">{a.fields.map((f) => <div key={f.id}><span>{f.label}</span><b className="small">{f.options ? f.options.join(' · ') : f.type === 'yn' ? 'Yes · No' : 'Yes · No · Not Applicable'}</b></div>)}</div></div>)}</div>}
          {tab === 'set' && <div className="col" style={{ maxWidth: 640 }}>
            <Field label="Client / regulatory approval gate (open decision)" help="Timing gates are not confirmed by Carnegie. Default: not enforced – the RA determination and related action are shown to QA.">
              <Select value={db.settings.clientGate} onChange={(e) => setDb((x) => ({ ...x, settings: { ...x.settings, clientGate: e.target.value }, admin: [...x.admin, { id: 'ad-' + Date.now(), at: new Date().toISOString(), actor: 'Rohit Sinha', action: 'Setting changed', detail: `Client approval gate = ${e.target.value}` }] }))}><option value="pending">Not enforced (pending QA confirmation)</option><option value="before_approval">Required before QA approval (demonstration)</option></Select></Field>
            <Field label="Default Change Control due date"><div className="chk on" style={{ width: 'fit-content' }}>60 days after final QA approval (editable by QA; never earlier than the latest action)</div></Field>
            <div><Button variant="danger" icon={RotateCcw} onClick={onReset}>Reset demo data</Button></div></div>}
          {tab === 'open' && <div className="col"><Banner tone="warn">These items from the Carnegie feedback are <b>not assumed approved</b>. The prototype behaviour is shown so QA/Management can confirm or change it.</Banner>{OPEN_DECISIONS.map((d) => <div key={d.id} className="acard"><div className="row between"><h3>{d.id} · {d.title}</h3><Badge tone="orange">Open – needs confirmation</Badge></div><div className="mt-s">{d.detail}</div><div className="small muted mt-s"><b>Prototype behaviour:</b> {d.behaviour}</div></div>)}</div>}
          {tab === 'about' && <div className="col" style={{ maxWidth: 720 }}><dl className="kv"><dt>Product</dt><dd>Carnegie Pharma – Change Control Management System</dd><dt>Version</dt><dd><b>{VERSION.label}</b></dd><dt>Based on</dt><dd>{VERSION.base}</dd><dt>Source document</dt><dd><FileText size={14} /> {VERSION.source}</dd><dt>Procedure reference</dt><dd>SOP QAD003.04 and the Carnegie Master Workflow</dd></dl></div>}
        </div></div>
    </>
  );
}
