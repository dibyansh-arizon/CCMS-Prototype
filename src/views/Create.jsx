import React, { useState } from 'react';
import { Save, Send, Info } from 'lucide-react';
import * as E from '../engine.js';
import { Button, Card, Field, Input, TextArea, Select, Banner, FilePicker, FileChip, PageHead } from '../ui.jsx';
import { CHANGE_TYPES } from '../data/forms.js';
import { fmtDate } from '../util.js';
import { ReturnedNote } from './Panels.jsx';

export default function Create({ rec, ctx, perform, onCreate, onCancel }) {
  const blank = { title: '', type: '', otherType: '', currentDoc: '', proposedDoc: '', supportingDocs: '', description: '', currentState: '', proposedChange: '', justification: '', layoutPlan: false, attachments: [] };
  const [f, setF] = useState(rec ? { ...blank, ...rec } : blank);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const facility = f.type === 'Equipment/Facility/Utility';
  const save = () => (rec ? perform(rec, E.saveDraft, [f], { success: 'Draft saved' }) : onCreate(f, false));
  const submit = () => {
    if (!rec) return onCreate(f, true);
    perform(rec, E.submit, [f], { sign: 'Authorship and submission', summary: `Submit ${rec.draftId} to the Department Head`, success: 'Submitted', after: onCancel });
  };
  const addFile = (name) => set('attachments', [...f.attachments, { id: Math.random().toString(36).slice(2), name, kind: 'Supporting', by: ctx.user.name, at: new Date().toISOString() }]);
  return (
    <div className="col" style={{ gap: 16, maxWidth: 980 }}>
      <PageHead title={rec ? 'Edit Change Control request' : 'Create Change Control'} sub="Stage 1 · complete the request, then submit it to your Department Head" />
      {rec && <ReturnedNote rec={rec} />}
      <Card title="Change information">
        <div className="grid g2">
          <Field label="Initiator"><Input readOnly value={ctx.user.name} /></Field>
          <Field label="Department"><Input readOnly value={ctx.user.dept} /></Field>
          <Field label="Date requested"><Input readOnly value={fmtDate(rec?.dateRequested || new Date())} /></Field>
          <Field label="Type of change" req><Select value={f.type} onChange={(e) => set('type', e.target.value)}><option value="">Select category…</option>{CHANGE_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
          {f.type === 'Other' && <Field label="Specify other" req><Input value={f.otherType} onChange={(e) => set('otherType', e.target.value)} /></Field>}
          <Field label="Title of the Change Control" req className="" ><Input value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Current document / material / equipment no."><Input value={f.currentDoc} onChange={(e) => set('currentDoc', e.target.value)} /></Field>
          <Field label="Proposed document / material / equipment no."><Input value={f.proposedDoc} onChange={(e) => set('proposedDoc', e.target.value)} /></Field>
        </div>
        <div className="mt"><Field label="Supporting / reference documents required"><Input value={f.supportingDocs} onChange={(e) => set('supportingDocs', e.target.value)} /></Field></div>
        {facility && (
          <div className="mt col">
            <Banner tone="warn" icon={Info}><b>QAD pre-approval required.</b> Changes to cGMP facilities, equipment or critical equipment parts need QAD approval before implementation.</Banner>
            <label className="chk" style={{ width: 'fit-content' }}><input type="checkbox" checked={f.layoutPlan} onChange={(e) => set('layoutPlan', e.target.checked)} />Converts a non-GMP area to a GMP suite or renovates a manufacturing suite – facility layout plan attached</label>
          </div>
        )}
      </Card>
      <Card title="Change details">
        <div className="col" style={{ gap: 14 }}>
          <Field label="Change details and description" req><TextArea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
          <div className="grid g2">
            <Field label="Current state" req><TextArea value={f.currentState} onChange={(e) => set('currentState', e.target.value)} /></Field>
            <Field label="Proposed change" req><TextArea value={f.proposedChange} onChange={(e) => set('proposedChange', e.target.value)} /></Field>
          </div>
          <Field label="Justification" req><TextArea value={f.justification} onChange={(e) => set('justification', e.target.value)} /></Field>
        </div>
      </Card>
      <Card title="Supporting attachments">
        <div className="row wrap">{f.attachments.map((a) => <FileChip key={a.id} name={a.name} />)}<FilePicker label="Attach file" onPick={addFile} /></div>
        <div className="help mt-s">R&amp;D laboratory activities are outside the scope of this procedure.</div>
      </Card>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button icon={Save} onClick={save}>Save draft</Button>
        <Button variant="primary" icon={Send} onClick={submit}>Submit to Department Head</Button>
      </div>
    </div>
  );
}
