import React, { useState } from 'react';
import * as E from '../engine.js';
import { Modal, Button, Banner, Field, Input, TextArea, Select } from '../ui.jsx';
import { EMPLOYEES, userById } from '../data/people.js';
import { extensionChain, MAX_EXTENSIONS } from '../data/forms.js';
import { fmtDate } from '../util.js';

// Extension request: CC details and extension count are prefilled; the initiator enters additional days and a reason.
export function ExtensionModal({ rec, perform, onClose }) {
  const level = E.approvedExtensions(rec) + 1;
  const [days, setDays] = useState('');
  const [reason, setReason] = useState('');
  const blocked = level > MAX_EXTENSIONS;
  const chain = extensionChain(Math.min(level, MAX_EXTENSIONS));
  return (
    <Modal title="Request extension" sub={`${rec.ccNumber} · ${rec.title}`} onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" disabled={blocked} onClick={() => perform(rec, E.requestExtension, [{ days, reason }], { sign: 'Extension request', summary: `Request extension no. ${level} (+${days || '?'} days)`, success: 'Extension request submitted', after: onClose })}>Submit request</Button></>}>
      <dl className="kv" style={{ gridTemplateColumns: '170px 1fr' }}>
        <dt>Current due date</dt><dd>{fmtDate(rec.dueDate)}</dd><dt>Approved extensions so far</dt><dd>{level - 1}</dd><dt>This request</dt><dd><b>Extension no. {Math.min(level, 5)}</b></dd>
        <dt>Open actions</dt><dd>{rec.actions.filter((a) => !['Completed', 'Cancelled'].includes(a.status)).length} (their deadlines move only after full approval)</dd>
      </dl>
      {blocked ? <Banner tone="danger">A fifth extension is an open decision and needs separate QA/Management confirmation. Please contact QA.</Banner>
        : <Banner tone="info"><b>Approval route (sequential):</b> {chain.map((c) => c.label).join(' → ')}{level < 4 && ' (the QAD HOD may optionally forward any request to the CEO)'}. Approvers can approve, reject or return for correction with reasons.</Banner>}
      <div className="grid g2"><Field label="Additional days requested" req><Input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} /></Field><Field label="Revised due date (on approval)"><Input readOnly value={days ? fmtDate(E.addDays(rec.dueDate, Number(days))) : '—'} /></Field></div>
      <Field label="Reason / justification" req><TextArea value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
    </Modal>
  );
}
export function AmendmentModal({ rec, perform, onClose }) {
  const [f, setF] = useState({ description: '', reason: '', ownerId: '', due: '' });
  return (
    <Modal title="Request amendment" sub="An additional action discovered after QA approval – subject to QA authorization (rules pending QA/Management confirmation)" onClose={onClose}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => perform(rec, E.requestAmendment, [f], { success: 'Amendment request sent to QA', after: onClose })}>Submit to QA</Button></>}>
      <Field label="Additional action required" req><TextArea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Why was it not identified earlier?" req><Input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></Field>
      <div className="grid g2"><Field label="Proposed owner" req><Select value={f.ownerId} onChange={(e) => setF({ ...f, ownerId: e.target.value })}><option value="">Select…</option>{EMPLOYEES.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select></Field><Field label="Proposed target date" req><Input type="date" value={f.due} onChange={(e) => setF({ ...f, due: e.target.value })} /></Field></div>
    </Modal>
  );
}
