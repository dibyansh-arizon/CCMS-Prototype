import React, { useState } from 'react';
import { Plus, Trash2, Send } from 'lucide-react';
import { Button, Field, Input, TextArea, Select, Seg, CheckGroup, Banner } from '../ui.jsx';
import { YNA, YN, DECISIONS, ANDA_STATUS, REPORTING_CRITERIA } from '../data/forms.js';
import { EMPLOYEES } from '../data/people.js';
import { cx } from '../util.js';

// ---------------- action items editor (owner + due date OR duration) ----------------
export const blankAction = () => ({ description: '', ownerId: '', mode: 'date', due: '', durationDays: '' });
export const cleanActions = (rows) =>
  rows.filter((r) => r.description.trim() || r.ownerId || r.due || r.durationDays).map((r) => ({
    description: r.description, ownerId: r.ownerId, due: r.mode === 'date' ? r.due : '', durationDays: r.mode === 'days' ? r.durationDays : '',
  }));

export function ActionEditor({ rows, onChange, title = 'Action items' }) {
  const set = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="col">
      <div className="row between"><div className="lbl">{title}</div><Button sm icon={Plus} onClick={() => onChange([...rows, blankAction()])}>Add action</Button></div>
      {rows.length === 0 && <div className="help">No action items yet.</div>}
      {rows.map((r, i) => (
        <div key={i} className="card pad" style={{ background: '#fafbfd' }}>
          <div className="grid g2">
            <Field label="Action to be completed" req className="grow"><TextArea style={{ minHeight: 60 }} value={r.description} onChange={(e) => set(i, { description: e.target.value })} /></Field>
            <div className="col">
              <Field label="Owner (any employee)" req>
                <Select value={r.ownerId} onChange={(e) => set(i, { ownerId: e.target.value })}>
                  <option value="">Select owner…</option>
                  {EMPLOYEES.map((u) => <option key={u.id} value={u.id}>{u.name} – {u.dept}</option>)}
                </Select>
              </Field>
              <div className="row wrap">
                <Seg options={['Due date', 'Days after approval']} value={r.mode === 'date' ? 'Due date' : 'Days after approval'} onChange={(v) => set(i, { mode: v === 'Due date' ? 'date' : 'days' })} />
                {r.mode === 'date' ? <Input type="date" style={{ width: 160 }} value={r.due} onChange={(e) => set(i, { due: e.target.value })} /> : <Input type="number" min="1" style={{ width: 100 }} placeholder="days" value={r.durationDays} onChange={(e) => set(i, { durationDays: e.target.value })} />}
                <Button sm variant="ghost" icon={Trash2} onClick={() => onChange(rows.filter((_, j) => j !== i))}>Remove</Button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------- one exact QAD question ----------------
export function Question({ f, answers, set, disabled }) {
  if (f.dependsOn && answers[f.dependsOn.field] !== f.dependsOn.value) return null;
  const v = answers[f.id];
  const opts = f.type === 'yna' ? YNA : f.type === 'yn' ? YN : f.options;
  return (
    <div className={f.type === 'multi' || f.type === 'single' ? 'col' : 'qrow'} style={f.type === 'multi' || f.type === 'single' ? { padding: '12px 0', borderBottom: '1px solid var(--line)' } : undefined}>
      <div className="strong" style={{ fontWeight: 500 }}>{f.label}</div>
      {f.type === 'yna' || f.type === 'yn' ? (
        <Seg options={opts} value={v} onChange={(x) => set(f.id, x)} disabled={disabled} />
      ) : (
        <>
          <CheckGroup options={opts} value={v} multi={f.type === 'multi'} onChange={(x) => set(f.id, x)} disabled={disabled} />
          {f.otherText && ((f.type === 'multi' && (v || []).includes('Other')) || v === 'Other') && (
            <Input placeholder="Specify other…" value={answers[f.id + 'Other'] || ''} disabled={disabled} onChange={(e) => set(f.id + 'Other', e.target.value)} />
          )}
        </>
      )}
    </div>
  );
}

// ---------------- Stage 3: department assessment (exact QAD questions for THIS department only) ----------------
export function AssessmentForm({ def, assessment, onSubmit, actingFor }) {
  const [answers, setAnswers] = useState(assessment.answers || {});
  const [decision, setDecision] = useState('');
  const [comments, setComments] = useState(assessment.comments || '');
  const [justification, setJustification] = useState('');
  const [clar, setClar] = useState('');
  const [actions, setActions] = useState([blankAction()]);
  const set = (id, v) => setAnswers((a) => ({ ...a, [id]: v }));
  const prior = assessment.clarifications.filter((c) => c.a);
  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="row between wrap">
        <div><h3>{def.name}</h3><div className="muted small">To be completed by the {def.completedBy}</div></div>
      </div>
      {actingFor && <Banner tone="info">You are completing this on behalf of <b>{actingFor}</b> (active delegation). Your signature will show the delegation.</Banner>}
      {prior.map((c, i) => <Banner key={i} tone="success"><b>Earlier clarification:</b> {c.q}<br /><span className="small">Answer: {c.a}</span></Banner>)}
      <div>{def.fields.map((f) => <Question key={f.id} f={f} answers={answers} set={set} />)}</div>
      <Field label="Impact/Required Action Items/Comments"><TextArea value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
      <div>
        <div className="lbl mb">Is the change acceptable?</div>
        <div className="grid g4">
          {DECISIONS.map((d) => (
            <button key={d.id} type="button" onClick={() => setDecision(d.id)} className={cx('card pad')} style={{ textAlign: 'left', cursor: 'pointer', borderColor: decision === d.id ? 'var(--accent)' : undefined, background: decision === d.id ? 'var(--accent-soft)' : '#fff' }}>
              <div className="strong">{d.label}</div><div className="help">{d.hint}</div>
            </button>
          ))}
        </div>
      </div>
      {decision === 'accept_action' && <ActionEditor rows={actions} onChange={setActions} />}
      {decision === 'clarify' && <Field label="Clarification needed from the initiator" req><TextArea value={clar} onChange={(e) => setClar(e.target.value)} /></Field>}
      {decision === 'reject' && <Field label="Justification (for QA resolution)" req><TextArea value={justification} onChange={(e) => setJustification(e.target.value)} /></Field>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="primary" icon={Send} disabled={!decision} onClick={() => onSubmit({ decision, answers, comments, justification, clarificationText: clar, actions: cleanActions(actions) })}>
          {decision === 'clarify' ? 'Send clarification request' : 'Submit assessment'}
        </Button>
      </div>
    </div>
  );
}

// Read-only view of a completed assessment's exact questions and answers
export function AssessmentReadOnly({ def, assessment }) {
  const a = assessment.answers || {};
  return (
    <div className="qa">
      {def.fields.map((f) => {
        if (f.dependsOn && a[f.dependsOn.field] !== f.dependsOn.value) return null;
        const v = a[f.id];
        const text = Array.isArray(v) ? v.map((x) => (x === 'Other' && a[f.id + 'Other'] ? `Other: ${a[f.id + 'Other']}` : x)).join(', ') : v === 'Other' && a[f.id + 'Other'] ? `Other: ${a[f.id + 'Other']}` : v;
        return <div key={f.id}><span>{f.label}</span><b>{text || '—'}</b></div>;
      })}
      {assessment.comments && <div><span>Impact/Required Action Items/Comments</span><b style={{ maxWidth: '60%', textAlign: 'right' }}>{assessment.comments}</b></div>}
    </div>
  );
}

// ---------------- Stage 4: regulatory assessment ----------------
export function RegulatoryForm({ rec, onSubmit }) {
  const prev = rec.reg || {};
  const [anda, setAnda] = useState(prev.andaStatus || '');
  const [applicable, setApplicable] = useState(prev.applicable || '');
  const [reporting, setReporting] = useState(prev.reporting || []);
  const [reference, setReference] = useState(prev.reference || '');
  const [regAction, setRegAction] = useState(prev.regActionRequired ?? null);
  const [client, setClient] = useState(prev.clientRequired ?? null);
  const [clientName, setClientName] = useState(prev.clientName || '');
  const [owner, setOwner] = useState(rec.actions.find((a) => a.kind === 'client')?.ownerId || '');
  const [comments, setComments] = useState(prev.comments || '');
  const [actions, setActions] = useState([blankAction()]);
  const [clar, setClar] = useState('');
  const [askClar, setAskClar] = useState(false);
  const yn = (v) => (v === null ? '' : v ? 'Yes' : 'No');
  return (
    <div className="col" style={{ gap: 14 }}>
      {prev.returnNote && <Banner tone="warn"><b>Returned by the initiator:</b> {prev.returnNote}</Banner>}
      <Field label="ANDA/DMF Application Status" req><CheckGroup options={ANDA_STATUS} value={anda} onChange={setAnda} /></Field>
      <Field label="Regulatory Assessment" req><Seg options={['Applicable', 'Not Applicable']} value={applicable} onChange={setApplicable} /></Field>
      {applicable === 'Applicable' && (
        <Field label="Reporting criteria for the proposed change(s)" req><CheckGroup multi options={REPORTING_CRITERIA} value={reporting} onChange={setReporting} /></Field>
      )}
      <Field label="Supporting reference (if any) and application number of the affected ANDA and/or DMF (if applicable)"><TextArea style={{ minHeight: 56 }} value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
      <div className="grid g2">
        <Field label="Regulatory action required?" req><Seg options={['Yes', 'No']} value={yn(regAction)} onChange={(v) => setRegAction(v === 'Yes')} /></Field>
        <Field label="Client approval required?" req><Seg options={['Yes', 'No']} value={yn(client)} onChange={(v) => setClient(v === 'Yes')} /></Field>
      </div>
      {regAction && <ActionEditor rows={actions} onChange={setActions} title="Regulatory action items" />}
      {client && (
        <div className="grid g2">
          <Field label="Customer/Client name" req><Input value={clientName} onChange={(e) => setClientName(e.target.value)} /></Field>
          <Field label="Employee responsible for obtaining client approval" req help="Obtains the client's signed approval externally and uploads the evidence.">
            <Select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">Select employee…</option>{EMPLOYEES.map((u) => <option key={u.id} value={u.id}>{u.name} – {u.dept}</option>)}</Select>
          </Field>
        </div>
      )}
      <Field label="Comments"><TextArea style={{ minHeight: 56 }} value={comments} onChange={(e) => setComments(e.target.value)} /></Field>
      {askClar && <Field label="Clarification needed" req><TextArea value={clar} onChange={(e) => setClar(e.target.value)} /></Field>}
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button onClick={() => (askClar ? onSubmit({ decision: 'clarify', clarificationText: clar }) : setAskClar(true))}>{askClar ? 'Send clarification request' : 'Request clarification'}</Button>
        <Button variant="primary" icon={Send} onClick={() => onSubmit({ andaStatus: anda, applicable, reporting, reference, regActionRequired: regAction, clientRequired: client, clientName, clientOwnerId: owner, comments, actions: cleanActions(actions) })}>Complete regulatory assessment</Button>
      </div>
    </div>
  );
}
