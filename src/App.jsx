import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import * as E from './engine.js';
import { makeCtx, onBehalfName } from './ctx.js';
import { loadDB, saveDB, resetDB } from './store.js';
import { USERS, userById } from './data/people.js';
import { ESignModal } from './ui.jsx';
import { Sidebar, Topbar, Login } from './views/Shell.jsx';
import { Dashboard, Register, Logbook, ExtensionsPage, AmendmentsPage, Reports, AuditPage, TaskTable } from './views/Pages.jsx';
import { PageHead, Card } from './ui.jsx';
import Workspace from './views/Workspace.jsx';
import Create from './views/Create.jsx';
import Admin from './views/Admin.jsx';

const parse = () => { const p = (window.location.hash.replace(/^#/, '') || '/').split('/').filter(Boolean); return p; };

export default function App() {
  const [db, setDbRaw] = useState(null);
  const [uid, setUid] = useState(() => sessionStorage.getItem('ccms_user') || null);
  const [route, setRoute] = useState(parse());
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [sign, setSign] = useState(null);
  const dbRef = useRef(null);

  useEffect(() => { loadDB().then((d) => { dbRef.current = d; setDbRaw(d); }); }, []);
  useEffect(() => { const h = () => { setRoute(parse()); setTab('overview'); }; window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), toast.type === 'error' ? 6000 : 3500); return () => clearTimeout(t); } }, [toast]);

  const setDb = useCallback((fn) => {
    const next = typeof fn === 'function' ? fn(dbRef.current) : fn;
    dbRef.current = next; setDbRaw(next); saveDB(next);
  }, []);
  const notify = useCallback((message, type = 'ok') => setToast({ message, type }), []);
  const go = (p) => { window.location.hash = p; };

  const user = uid ? userById(uid) : null;
  const ctxFor = useCallback((u = user) => makeCtx(u, { delegations: db.delegations, settings: db.settings, counters: db.counters, now: new Date() }), [db, user]);

  // ---- commit helpers ----
  const commit = (rec) => setDb((d) => ({ ...d, records: d.records.some((r) => r.id === rec.id) ? d.records.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...d.records] }));

  // Run an engine function. Validates first (dry run), then asks for the e-signature if required, then commits.
  const perform = (rec, fn, args, opts = {}) => {
    const cur = dbRef.current;
    const live = cur.records.find((r) => r.id === rec.id) || rec;
    const ctx = makeCtx(user, { delegations: cur.delegations, settings: cur.settings, counters: cur.counters, now: new Date() });
    ctx.onBehalfOf = onBehalfName(ctx, live, opts.key);
    let next;
    try { next = fn(live, ctx, ...args); } catch (e) { if (e instanceof E.WorkflowError) { notify(e.message, 'error'); return false; } throw e; }
    const finish = () => { commit(next); opts.chain?.(next); if (!opts.silent) notify(opts.success || 'Saved'); opts.after?.(next); };
    if (opts.sign && !opts.silent) { setSign({ meaning: opts.sign, summary: opts.summary || 'Confirm this action', onConfirm: () => { setSign(null); finish(); } }); return undefined; }
    finish();
    return true;
  };
  const onBehalf = (rec, key) => (user ? onBehalfName(ctxFor(), rec, key) : null);

  const createRecord = (form, submitNow) => {
    const cur = dbRef.current; const ctx = makeCtx(user, { delegations: cur.delegations, settings: cur.settings, counters: cur.counters, now: new Date() });
    let rec;
    try { rec = E.createDraft(ctx, form); if (submitNow) E.submit(rec, ctx); } catch (e) { if (e instanceof E.WorkflowError) { notify(e.message, 'error'); return; } throw e; }
    const finish = () => {
      let r = rec; const c2 = makeCtx(user, { delegations: cur.delegations, settings: cur.settings, counters: cur.counters, now: new Date() });
      if (submitNow) r = E.submit(r, c2);
      setDb((d) => ({ ...d, records: [r, ...d.records], counters: cur.counters }));
      notify(submitNow ? `Submitted to your Department Head (${r.draftId})` : 'Draft saved'); go('/cc/' + r.id);
    };
    if (submitNow) setSign({ meaning: 'Authorship and submission', summary: `Submit ${rec.draftId} to the Department Head`, onConfirm: () => { setSign(null); finish(); } }); else finish();
  };

  if (!db) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!user) return <Login onLogin={(id) => { sessionStorage.setItem('ccms_user', id); setUid(id); go('/'); }} />;

  const ctx = ctxFor();
  const records = db.records;
  const tasks = E.tasksFor(records, ctx);
  const taskCounts = Object.fromEntries(USERS.map((u) => [u.id, E.tasksFor(records, makeCtx(u, { delegations: db.delegations, settings: db.settings, counters: db.counters })).length]));
  const [page, a, b] = route;
  const open = (id) => go('/cc/' + id);
  const rec = page === 'cc' ? records.find((r) => r.id === a) : null;
  const names = { tasks: 'My Tasks', changes: 'Change Controls', create: 'Create Change Control', logbook: 'Logbook', extensions: 'Extension Requests', amendments: 'Amendments', reports: 'Reports', audit: 'Audit Trail', admin: 'Administration' };
  const crumb = page === 'cc' ? `Change Control · ${rec?.ccNumber || rec?.draftId || ''}` : names[page] || 'Dashboard';

  let view;
  if (page === 'cc' && rec && b === 'edit') view = <Create rec={rec} ctx={ctx} perform={perform} onCancel={() => go('/cc/' + rec.id)} />;
  else if (page === 'cc' && rec) view = <Workspace rec={rec} ctx={ctx} records={records} perform={perform} onBack={() => window.history.back()} onEdit={() => go(`/cc/${rec.id}/edit`)} onBehalf={onBehalf} tab={tab} setTab={setTab} />;
  else if (page === 'create') view = <Create ctx={ctx} onCreate={createRecord} perform={perform} onCancel={() => go('/')} />;
  else if (page === 'tasks') view = <><PageHead title="My Tasks" sub="Everything waiting for you across all Change Controls" /><Card pad={false}><TaskTable tasks={tasks} open={open} /></Card></>;
  else if (page === 'changes') view = <Register records={records} open={open} ctx={ctx} />;
  else if (page === 'logbook') view = <Logbook records={records} open={open} />;
  else if (page === 'extensions') view = <ExtensionsPage records={records} ctx={ctx} open={open} />;
  else if (page === 'amendments') view = <AmendmentsPage records={records} ctx={ctx} open={open} />;
  else if (page === 'reports') view = <Reports records={records} open={open} />;
  else if (page === 'audit') view = <AuditPage records={records} admin={db.admin} />;
  else if (page === 'admin') view = <Admin ctx={ctx} db={db} setDb={setDb} toast={notify} onReset={() => { const d = resetDB(); dbRef.current = d; setDbRaw(d); saveDB(d); notify('Demo data reset'); go('/'); }} />;
  else view = <Dashboard ctx={ctx} records={records} tasks={tasks} open={open} go={go} />;

  const activeNav = page === 'cc' ? 'changes' : page || 'dashboard';
  return (
    <div className="shell">
      <Sidebar page={activeNav} go={go} roleId={user.roleId} taskCount={tasks.length} />
      <div className="main">
        <Topbar crumb={crumb} user={user} tasks={tasks} taskCounts={taskCounts} switchUser={(id) => { sessionStorage.setItem('ccms_user', id); setUid(id); go('/'); }} signOut={() => { sessionStorage.removeItem('ccms_user'); setUid(null); }} openTask={open} />
        <main className="content">{page === 'cc' && !rec ? <div className="empty">Change Control not found.</div> : view}</main>
      </div>
      {sign && <ESignModal user={user} meaning={sign.meaning} summary={sign.summary} onConfirm={sign.onConfirm} onCancel={() => setSign(null)} />}
      {toast && <div className={`toast ${toast.type === 'error' ? 'error' : ''}`}>{toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}<div>{toast.message}</div></div>}
    </div>
  );
}
