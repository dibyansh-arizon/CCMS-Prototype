import React, { useState } from 'react';
import { X, ShieldCheck, FileText, Paperclip } from 'lucide-react';
import { cx, initials } from './util.js';
import { STATUS as S } from './data/forms.js';

export const Badge = ({ tone = '', children }) => <span className={cx('badge', tone)}>{children}</span>;

const STATUS_TONE = {
  [S.DRAFT]: '', [S.RETURNED]: 'orange', [S.PEND_ENDORSE]: 'blue', [S.PEND_SCREEN]: 'blue', [S.ASSESS]: 'blue', [S.REG]: 'blue',
  [S.CONSOL]: 'blue', [S.QA_APPROVAL]: 'blue', [S.IMPL]: 'orange', [S.CLOSEOUT]: 'blue', [S.CLOSED]: 'green', [S.REJECTED]: 'red', [S.CANCELLED]: 'red',
};
export const StatusBadge = ({ status }) => <Badge tone={STATUS_TONE[status]}>{status}</Badge>;
export const ASSESS_TONE = { Pending: '', 'Clarification Requested': 'orange', Accepted: 'green', 'Accepted with Action': 'green', 'Not Acceptable': 'red' };
export const ACTION_TONE = { Planned: '', 'Not Started': 'navy', 'In Progress': 'orange', Completed: 'green', Cancelled: 'red' };

export const Avatar = ({ name, sm }) => <span className={cx('avatar', sm && 'sm')}>{initials(name)}</span>;

export function Button({ variant = '', sm, icon: Icon, children, ...p }) {
  return (
    <button {...p} className={cx('btn', variant, sm && 'sm', p.className)}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}
export const Card = ({ title, sub, right, children, className, pad = true }) => (
  <div className={cx('card', className)}>
    {(title || right) && (
      <div className="card-h">
        <div>
          <h2>{title}</h2>
          {sub && <div className="muted small">{sub}</div>}
        </div>
        {right}
      </div>
    )}
    {pad ? <div className="card-b">{children}</div> : children}
  </div>
);
export const PageHead = ({ title, sub, right }) => (
  <div className="page-head">
    <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
    {right && <div className="row">{right}</div>}
  </div>
);
export const Banner = ({ tone = '', icon: Icon, children }) => (
  <div className={cx('banner', tone)}>
    {Icon && <Icon size={18} className="ic" />}
    <div className="grow">{children}</div>
  </div>
);
export const Empty = ({ children }) => <div className="empty">{children}</div>;

export const Field = ({ label, req, help, children, className }) => (
  <div className={cx('field', className)}>
    {label && <label className={req ? 'req' : ''}>{label}</label>}
    {children}
    {help && <span className="help">{help}</span>}
  </div>
);
export const Input = (p) => <input {...p} className={cx('input', p.className)} />;
export const TextArea = (p) => <textarea {...p} className={cx('textarea', p.className)} />;
export const Select = ({ children, ...p }) => <select {...p} className={cx('select', p.className)}>{children}</select>;

// Segmented single-choice control (Yes / No / Not Applicable etc.)
export function Seg({ options, value, onChange, disabled }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button type="button" key={o} disabled={disabled} className={cx(value === o && 'on', value === o && o === 'Yes' && 'yes', value === o && o === 'No' && 'no')} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}
// Tick-box group: multi (array) or single (string)
export function CheckGroup({ options, value, onChange, multi, disabled }) {
  const sel = multi ? value || [] : value;
  const toggle = (o) => {
    if (disabled) return;
    if (multi) onChange(sel.includes(o) ? sel.filter((x) => x !== o) : [...sel, o]);
    else onChange(o);
  };
  return (
    <div className="row wrap">
      {options.map((o) => {
        const on = multi ? sel.includes(o) : sel === o;
        return (
          <label key={o} className={cx('chk', on && 'on')}>
            <input type={multi ? 'checkbox' : 'radio'} checked={on} disabled={disabled} onChange={() => toggle(o)} />
            {o}
          </label>
        );
      })}
    </div>
  );
}
export function FilePicker({ onPick, label = 'Attach file', accept }) {
  return (
    <label className="btn sm" style={{ cursor: 'pointer' }}>
      <Paperclip size={14} /> {label}
      <input type="file" accept={accept} className="hide" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f.name); e.target.value = ''; }} />
    </label>
  );
}
export const FileChip = ({ name }) => <span className="file-chip"><FileText size={13} /> {name}</span>;

export function Modal({ title, sub, onClose, children, footer, wide }) {
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={cx('modal', wide && 'wide')}>
        <div className="modal-h row between">
          <div><h2>{title}</h2>{sub && <div className="muted small mt-s">{sub}</div>}</div>
          {onClose && <button className="btn ghost" onClick={onClose} aria-label="Close"><X size={18} /></button>}
        </div>
        <div className="modal-b">{children}</div>
        {footer && <div className="modal-f">{footer}</div>}
      </div>
    </div>
  );
}

// 21 CFR Part 11 style e-signature: identity + meaning + re-authentication
export function ESignModal({ user, meaning, summary, onConfirm, onCancel }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!pw.trim()) { setErr('Enter your password to sign.'); return; }
    onConfirm();
  };
  return (
    <Modal
      title="Electronic signature"
      sub="Re-authentication is required for every signed action."
      onClose={onCancel}
      footer={<><Button onClick={onCancel}>Cancel</Button><Button variant="primary" icon={ShieldCheck} onClick={submit}>Sign and confirm</Button></>}
    >
      <div className="banner info">
        <ShieldCheck size={18} className="ic" />
        <div>
          <div className="strong">{summary}</div>
          <div className="small">Meaning of signature: <b>{meaning}</b></div>
        </div>
      </div>
      <dl className="kv">
        <dt>Signer</dt><dd>{user.name}</dd>
        <dt>Date / time</dt><dd>{new Date().toLocaleString('en-GB')}</dd>
      </dl>
      <Field label="Password" req help="Demo environment: any non-empty value is accepted.">
        <Input type="password" autoFocus value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} onKeyDown={(e) => e.key === 'Enter' && submit()} />
        {err && <span className="small" style={{ color: 'var(--danger)' }}>{err}</span>}
      </Field>
    </Modal>
  );
}
