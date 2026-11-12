import React, { useState } from 'react';
import { LayoutDashboard, ListChecks, Files, BookOpen, Clock, FileEdit, BarChart3, ScrollText, Settings, Bell, ChevronDown, LogOut, Plus, Search } from 'lucide-react';
import { USERS, ROLES } from '../data/people.js';
import { Avatar, Input } from '../ui.jsx';
import { cx } from '../util.js';
import logo from '../../carnegie_pharmaceuticals_llc_logo.jpeg';

const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard, '*'],
  ['tasks', 'My Tasks', ListChecks, '*'],
  ['changes', 'Change Controls', Files, '*'],
  ['create', 'Create Change Control', Plus, ['initiator']],
  ['logbook', 'Logbook', BookOpen, ['qa_designee', 'qa_head', 'auditor', 'admin', 'management']],
  ['extensions', 'Extension Requests', Clock, '*'],
  ['amendments', 'Amendments', FileEdit, ['initiator', 'qa_designee', 'qa_head', 'auditor', 'management']],
  ['reports', 'Reports', BarChart3, ['qa_designee', 'qa_head', 'auditor', 'management', 'admin', 'dept_head']],
  ['audit', 'Audit Trail', ScrollText, ['qa_designee', 'qa_head', 'auditor', 'admin', 'management']],
  ['admin', 'Administration', Settings, ['admin', 'qa_head', 'auditor']],
];
export const navFor = (roleId) => NAV.filter(([, , , r]) => r === '*' || r.includes(roleId));

export function Sidebar({ page, go, roleId, taskCount }) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-logo"><img src={logo} alt="Carnegie Pharma" /></div></div>
      <div className="nav-title">Change Control Management</div>
      <nav className="nav">
        {navFor(roleId).map(([k, label, Icon]) => (
          <button key={k} className={cx(page === k && 'active')} onClick={() => go(k === 'dashboard' ? '/' : '/' + k)}>
            <Icon size={18} /><span className="lbl-t">{label}</span>{k === 'tasks' && taskCount > 0 && <span className="count">{taskCount}</span>}
          </button>
        ))}
      </nav>
      <div className="side-foot"><div><span className="dot" />Controlled environment</div><div>Carnegie SOP QAD003.04 · Prototype</div></div>
    </aside>
  );
}

export function Topbar({ crumb, user, tasks, switchUser, signOut, openTask, taskCounts }) {
  const [menu, setMenu] = useState(null);
  const [q, setQ] = useState('');
  const groups = {};
  USERS.filter((u) => !q || (u.name + ROLES[u.roleId].label).toLowerCase().includes(q.toLowerCase())).forEach((u) => { (groups[ROLES[u.roleId].group] ||= []).push(u); });
  return (
    <header className="topbar">
      <div className="crumb grow">Carnegie Pharma &nbsp;›&nbsp; <b>{crumb}</b></div>
      <div style={{ position: 'relative' }}>
        <button className="bell" onClick={() => setMenu(menu === 'n' ? null : 'n')} aria-label="Notifications"><Bell size={18} />{tasks.length > 0 && <span className="pip">{tasks.length}</span>}</button>
        {menu === 'n' && (
          <div className="popover">
            <div className="pop-grp">Waiting for you</div>
            {tasks.slice(0, 6).map((t, i) => <div key={i} className="pop-item" onClick={() => { setMenu(null); openTask(t.rec.id); }}><div><div className="strong">{t.rec.ccNumber || t.rec.draftId}</div><div className="small muted">{t.title}</div></div></div>)}
            {!tasks.length && <div className="empty">You are all caught up.</div>}
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button className="userbtn" onClick={() => setMenu(menu === 'u' ? null : 'u')}>
          <Avatar name={user.name} /><div style={{ textAlign: 'left' }}><div className="strong" style={{ lineHeight: 1.2 }}>{user.name}</div><div className="small muted" style={{ lineHeight: 1.2 }}>{ROLES[user.roleId].label}</div></div><ChevronDown size={16} className="muted" />
        </button>
        {menu === 'u' && (
          <div className="popover" style={{ width: 420 }}>
            <div style={{ padding: 10 }}><div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} /><Input style={{ paddingLeft: 30 }} placeholder="Switch user / role (demo)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div></div>
            {Object.entries(groups).map(([g, us]) => <div key={g}><div className="pop-grp">{g}</div>{us.map((u) => <div key={u.id} className={cx('pop-item', u.id === user.id && 'on')} onClick={() => { setMenu(null); setQ(''); switchUser(u.id); }}><Avatar sm name={u.name} /><div className="grow"><div className="strong">{u.name}</div><div className="small muted">{ROLES[u.roleId].label} · {u.dept}</div></div>{taskCounts[u.id] > 0 && <span className="badge orange">{taskCounts[u.id]}</span>}</div>)}</div>)}
            <div className="pop-item" onClick={() => { setMenu(null); signOut(); }}><LogOut size={16} /> Sign out</div>
          </div>
        )}
      </div>
    </header>
  );
}

export function Login({ onLogin }) {
  const groups = {};
  USERS.forEach((u) => { (groups[ROLES[u.roleId].group] ||= []).push(u); });
  return (
    <div className="login">
      <div className="login-card">
        <div className="row between wrap mb"><img src={logo} alt="Carnegie Pharma" style={{ height: 56 }} /><span className="badge navy">Demonstration environment</span></div>
        <h1>Change Control Management System</h1>
        <p className="muted mt-s mb">Choose a user to sign in. Each role sees only the work assigned to it by the Master Workflow.</p>
        <div style={{ maxHeight: '52vh', overflow: 'auto', paddingRight: 4 }}>
          {Object.entries(groups).map(([g, us]) => <div key={g} className="mb"><div className="section-t">{g}</div><div className="grid g3">{us.map((u) => <button key={u.id} className="persona" onClick={() => onLogin(u.id)}><Avatar name={u.name} /><div><div className="strong">{u.name}</div><div className="small muted">{ROLES[u.roleId].label}</div></div></button>)}</div></div>)}
        </div>
      </div>
    </div>
  );
}
