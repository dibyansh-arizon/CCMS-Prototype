import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import * as E from './engine.js';
import { makeCtx } from './ctx.js';
import { loadDB, saveDB, resetDB } from './store.js';
import { USERS, userById, hasRole } from './data/people.js';
import { ESignModal, PageHead, Card } from './ui.jsx';
import { Sidebar, Topbar, Login } from './views/Shell.jsx';
import { Dashboard, Register, TaskTable, Reports, AuditPage, notificationsFor } from './views/Pages.jsx';
import Workspace from './views/Workspace.jsx';
import Create from './views/Create.jsx';
import Admin from './views/Admin.jsx';

const parse = () => (window.location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean);

export default function App() {
  const [db, setDbRaw] = useState(null);
  const [uid, setUid] = useState(() => sessionStorage.getItem('ccms_user') || null);
  const [route, setRoute] = useState(parse());
  const [toast, setToast] = useState(null);
  const [sign, setSign] = useState(null);
  const dbRef = useRef(null);
  useEffect(() => { loadDB().then((d) => { dbRef.current = d; setDbRaw(d); }); }, []);
  useEffect(() => { const h = () => setRoute(parse()); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), toast.type === 'error' ? 6500 : 4500); return () => clearTimeout(t); } }, [toast]);
  const setDb = useCallback((fn) => { const next = typeof fn === 'function' ? fn(dbRef.current) : fn; dbRef.current = next; setDbRaw(next); saveDB(next); }, []);
  const notify = useCallback((message, type = 'ok') => setToast({ message, type }), []);
  const go = (p) => { window.location.hash = p; };
  if (!db) return <div style={{ padding: 40 }}>Loading…</div>;
  const user = uid ? userById(uid) : null;
  if (!user) return <Login onLogin={(id) => { sessionStorage.setItem('ccms_user', id); setUid(id); go('/'); }} />;

  const mk = (u = user) => makeCtx(u, { settings: db.settings, counters: dbRef.current.counters, now: new Date() });
  const ctx = mk();
  const records = db.records;
  const commit = (rec) => setDb((d) => ({ ...d, records: d.records.some((r) => r.id === rec.id) ? d.records.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...d.records] }));

  const perform = (rec, fn, args, opts = {}) => {
    const live = dbRef.current.records.find((r) => r.id === rec.id) || rec;
    let next;
    try { next = fn(live, mk(), ...args); } catch (e) { if (e instanceof E.WorkflowError) { notify(e.message, 'error'); return false; } throw e; }
    const finish = () => { commit(next); if (!opts.silent) notify(opts.success || 'Saved'); opts.chain?.(next); opts.after?.(next); };
    if (opts.sign && !opts.silent) { setSign({ meaning: opts.sign, summary: opts.summary || 'Confirm this action', onConfirm: () => { setSign(null); finish(); } }); return undefined; }
    finish(); return true;
  };
  const createRecord = (form, submitNow) => {
    const c = mk(); let rec;
    try { rec = E.createDraft(c, form); if (submitNow) rec = E.submit(rec, mk()); } catch (e) { if (e instanceof E.WorkflowError) { notify(e.message, 'error'); return; } throw e; }
    const finish = () => { setDb((d) => ({ ...d, records: [rec, ...d.records], counters: dbRef.current.counters })); notify(submitNow ? `Submitted to your HOD (${rec.draftId})` : 'Draft saved'); go('/cc/' + rec.id); };
    if (submitNow) setSign({ meaning: 'Authorship and submission', summary: `Submit ${rec.draftId} to the HOD`, onConfirm: () => { setSign(null); finish(); } }); else finish();
  };

  const tasks = E.tasksFor(records, ctx);
  const taskCounts = Object.fromEntries(USERS.map((u) => [u.id, E.tasksFor(records, mk(u)).length]));
  const notes = notificationsFor(records, tasks, ctx);
  const open = (id, tab, actionId) => go(`/cc/${id}${tab ? '/' + tab : ''}${actionId ? '/' + actionId : ''}`);
  const [page, a, b, c] = route;
  const rec = page === 'cc' ? records.find((r) => r.id === a) : null;
  const names = { tasks: 'My Tasks', changes: 'Change Controls', create: 'Create Change Control', reports: 'Reports', audit: 'Audit Trail', admin: 'Administration' };
  const crumb = page === 'cc' ? `Change Control · ${rec?.ccNumber || rec?.draftId || ''}` : names[page] || 'Dashboard';
  const tabKey = { overview: 'overview', assess: 'assess', actions: 'actions', docs: 'docs', history: 'history' }[b] || 'overview';
  const common = { ctx, records, perform };
  const allowed = { tasks: ['employee', 'hod', 'ra_designee', 'qa_designee', 'ceo'], changes: ['employee', 'hod', 'ra_designee', 'qa_designee', 'ceo'], create: ['employee', 'hod', 'ra_designee', 'qa_designee'], reports: ['hod', 'qa_designee', 'ceo'], admin: ['admin'], audit: ['admin'] };
  const denied = page && allowed[page] && !hasRole(user, ...allowed[page]);
  let view;
  if (denied) view = <Card className="pad"><div className="col" style={{ alignItems: 'center', padding: 30 }}><ShieldAlert size={36} color="var(--danger)" /><h2>This page is not available for your role</h2></div></Card>;
  else if (page === 'cc' && rec) {
    if (!E.canViewRecord(rec, user)) view = <Card className="pad"><div className="col" style={{ alignItems: 'center', padding: 30 }}><ShieldAlert size={36} color="var(--danger)" /><h2>You are not authorized to open this Change Control</h2></div></Card>;
    else if (b === 'edit') view = <Create {...common} rec={rec} onCancel={() => go('/cc/' + rec.id)} />;
    else view = <Workspace {...common} rec={rec} tab={tabKey} openAction={c || null} setTab={(t) => go(`/cc/${rec.id}/${t}`)} onBack={() => window.history.back()} onEdit={() => go(`/cc/${rec.id}/edit`)} onBehalf={() => null} />;
  } else if (page === 'create') view = <Create {...common} onCreate={createRecord} onCancel={() => go('/')} />;
  else if (page === 'tasks') view = <><PageHead title="My Tasks" sub="One inbox: endorsements, reviews, action items, clarifications, corrections, extension approvals and QA decisions – each opens directly on the required action" /><Card pad={false}><TaskTable tasks={tasks} open={open} /></Card></>;
  else if (page === 'changes') view = <Register {...common} open={open} />;
  else if (page === 'reports') view = <Reports {...common} open={open} />;
  else if (page === 'audit') view = <AuditPage records={records} admin={db.admin} />;
  else if (page === 'admin') view = <Admin db={db} setDb={setDb} onReset={() => { const d = resetDB(); dbRef.current = d; setDbRaw(d); saveDB(d); notify('Demo data reset'); go('/'); }} />;
  else view = <Dashboard {...common} tasks={tasks} open={open} go={go} />;
  const nav = page === 'cc' ? 'changes' : page || 'dashboard';
  return (
    <div className="shell">
      <Sidebar page={nav} go={go} user={user} taskCount={tasks.length} />
      <div className="main">
        <Topbar crumb={crumb} user={user} notes={notes} taskCounts={taskCounts} openNote={(n) => open(n.recId, n.tab, n.actionId)} switchUser={(id) => { sessionStorage.setItem('ccms_user', id); setUid(id); go('/'); }} signOut={() => { sessionStorage.removeItem('ccms_user'); setUid(null); }} />
        <main className="content">{page === 'cc' && !rec ? <div className="empty">Change Control not found.</div> : view}</main>
      </div>
      {sign && <ESignModal user={user} meaning={sign.meaning} summary={sign.summary} onConfirm={sign.onConfirm} onCancel={() => setSign(null)} />}
      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}<div>{toast.message}</div></div>}
    </div>
  );
}
