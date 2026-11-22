import React, { useState } from 'react';
import { LayoutDashboard, ListChecks, Files, BarChart3, ScrollText, Bell, Settings, ChevronDown, LogOut, Search, Plus, Clock } from 'lucide-react';
import { USERS, ROLES, hasRole, roleLabel } from '../data/people.js';
import { Avatar, Input, Button, Badge } from '../ui.jsx';
import { cx, fmtDate } from '../util.js';
import { VERSION } from '../data/forms.js';
import logo from '../../carnegie_pharmaceuticals_llc_logo.jpeg';

// Navigation by role (union for multi-role accounts). Admin: Dashboard, Administration, Audit Trail only.
const NAV = [
  ['dashboard', 'Dashboard', LayoutDashboard, ['employee', 'hod', 'ra_designee', 'qa_designee', 'ceo', 'admin']],
  ['tasks', 'My Tasks', ListChecks, ['employee', 'hod', 'ra_designee', 'qa_designee', 'ceo']],
  ['changes', 'Change Controls', Files, ['employee', 'hod', 'ra_designee', 'qa_designee', 'ceo']],
  ['reports', 'Reports', BarChart3, ['hod', 'qa_designee', 'ceo']],
  ['admin', 'Administration', Settings, ['admin']],
  ['audit', 'Audit Trail', ScrollText, ['admin']],
];
export const navFor = (u) => NAV.filter(([, , , rs]) => hasRole(u, ...rs));
export const canCreate = (u) => hasRole(u, 'employee', 'hod', 'ra_designee', 'qa_designee');

export function Sidebar({ page, go, user, taskCount }) {
  return (
    <aside className="sidebar">
      <div className="brand"><div className="brand-logo"><img src={logo} alt="Carnegie Pharma" /></div></div>
      {canCreate(user) && <div style={{ padding: '14px 12px 4px' }}><button className="btn primary" style={{ width: '100%' }} onClick={() => go('/create')}><Plus size={16} /> Create Change Control</button></div>}
      <nav className="nav" style={{ marginTop: 8 }}>
        {navFor(user).map(([k, label, Icon]) => (
          <button key={k} className={cx(page === k && 'active')} onClick={() => go(k === 'dashboard' ? '/' : '/' + k)}>
            <Icon size={18} /><span className="lbl-t">{label}</span>{k === 'tasks' && taskCount > 0 && <span className="count">{taskCount}</span>}
          </button>
        ))}
      </nav>
      <div className="side-foot"><div><span className="dot" />Controlled environment</div><div>Carnegie CCMS · v{VERSION.number}</div></div>
    </aside>
  );
}

// Notifications (header): pending tasks + one-week due-date reminders, derived live from the records
export function Topbar({ crumb, user, notes, openNote, switchUser, signOut, taskCounts }) {
  const [menu, setMenu] = useState(null);
  const [q, setQ] = useState('');
  const groups = {};
  USERS.filter((u) => !q || (u.name + roleLabel(u)).toLowerCase().includes(q.toLowerCase())).forEach((u) => { (groups[u.group] ||= []).push(u); });
  return (
    <header className="topbar">
      <div className="crumb grow">Carnegie Pharma &nbsp;›&nbsp; <b>{crumb}</b></div>
      <div style={{ position: 'relative' }}>
        <button className="bell" onClick={() => setMenu(menu === 'n' ? null : 'n')} aria-label="Notifications"><Bell size={18} />{notes.length > 0 && <span className="pip">{notes.length}</span>}</button>
        {menu === 'n' && (
          <div className="popover" style={{ width: 430 }}>
            <div className="pop-grp">Notifications</div>
            {notes.slice(0, 8).map((n, i) => <div key={i} className="pop-item" onClick={() => { setMenu(null); openNote(n); }}><div className="grow"><div className="strong small">{n.reminder ? <><Clock size={12} /> Reminder · </> : null}{n.title}</div><div className="small muted" style={{ whiteSpace: 'normal' }}>{n.number} · {n.detail}</div></div></div>)}
            {!notes.length && <div className="empty">You are all caught up.</div>}
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button className="userbtn" onClick={() => setMenu(menu === 'u' ? null : 'u')}>
          <Avatar name={user.name} /><div style={{ textAlign: 'left' }}><div className="strong" style={{ lineHeight: 1.2 }}>{user.name}</div><div className="small muted" style={{ lineHeight: 1.2 }}>{roleLabel(user)}</div></div><ChevronDown size={16} className="muted" />
        </button>
        {menu === 'u' && (
          <div className="popover" style={{ width: 430 }}>
            <div style={{ padding: 10 }}><div style={{ position: 'relative' }}><Search size={15} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--muted)' }} /><Input style={{ paddingLeft: 30 }} placeholder="Switch user / role (demo)" value={q} onChange={(e) => setQ(e.target.value)} autoFocus /></div></div>
            {Object.entries(groups).map(([g, us]) => <div key={g}><div className="pop-grp">{g}</div>{us.map((u) => <div key={u.id} className={cx('pop-item', u.id === user.id && 'on')} onClick={() => { setMenu(null); setQ(''); switchUser(u.id); }}><Avatar sm name={u.name} /><div className="grow"><div className="strong">{u.name}</div><div className="small muted">{roleLabel(u)} · {u.dept}</div></div>{taskCounts[u.id] > 0 && <span className="badge orange">{taskCounts[u.id]}</span>}</div>)}</div>)}
            <div className="pop-item" onClick={() => { setMenu(null); signOut(); }}><LogOut size={16} /> Sign out</div>
          </div>
        )}
      </div>
    </header>
  );
}

export function Login({ onLogin }) {
  const groups = {};
  USERS.forEach((u) => { (groups[u.group] ||= []).push(u); });
  return (
    <div className="login">
      <div className="login-card">
        <div className="row between wrap mb"><img src={logo} alt="Carnegie Pharma" style={{ height: 56 }} /><span className="badge navy">Demonstration · v{VERSION.number}</span></div>
        <h1>Change Control Management System</h1>
        <p className="muted mt-s mb">Choose a user to sign in. Each role sees only the work and menu items it is permitted. One account may hold several roles (for example Meera Iyer: HOD + RA Designee).</p>
        <div style={{ maxHeight: '50vh', overflow: 'auto', paddingRight: 4 }}>
          {Object.entries(groups).map(([g, us]) => <div key={g} className="mb"><div className="section-t">{g}</div><div className="grid g3">{us.map((u) => <button key={u.id} className="persona" onClick={() => onLogin(u.id)}><Avatar name={u.name} /><div><div className="strong">{u.name}</div><div className="small muted">{roleLabel(u)}</div></div></button>)}</div></div>)}
        </div>
        <div className="small muted mt">Source: {VERSION.source}</div>
      </div>
    </div>
  );
}
