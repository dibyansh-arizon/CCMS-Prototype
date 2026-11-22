import React, { useState } from 'react';
import { Plus, Trash2, Maximize2 } from 'lucide-react';
import { Button, Modal, TextArea } from '../ui.jsx';

// Four-column change table: S.No | Current State | Proposed Change | Justification (one change per row)
export function ChangeTable({ rows, onChange, readOnly }) {
  const [big, setBig] = useState(null); // { i, k }
  const set = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const labels = { current: 'Current State', proposed: 'Proposed Change', justification: 'Justification' };
  return (
    <div className="col">
      <div className="table-wrap"><table className="t ctable">
        <thead><tr><th style={{ width: 60 }}>S.No</th><th>Current State</th><th>Proposed Change</th><th>Justification</th>{!readOnly && <th style={{ width: 44 }}></th>}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i}>
            <td className="strong">{i + 1}</td>
            {['current', 'proposed', 'justification'].map((k) => (
              <td key={k} style={{ minWidth: 220 }}>
                {readOnly ? <div style={{ whiteSpace: 'pre-wrap' }}>{r[k]}</div> : (
                  <div style={{ position: 'relative' }}><TextArea style={{ minHeight: 70, paddingRight: 28 }} value={r[k]} onChange={(e) => set(i, k, e.target.value)} />
                    <button type="button" className="btn ghost sm" title="Expand" style={{ position: 'absolute', top: 2, right: 0 }} onClick={() => setBig({ i, k })}><Maximize2 size={14} /></button></div>
                )}
              </td>))}
            {!readOnly && <td><button type="button" className="btn ghost sm" title="Remove row" disabled={rows.length < 2} onClick={() => onChange(rows.filter((_, j) => j !== i))}><Trash2 size={15} /></button></td>}
          </tr>))}</tbody>
      </table></div>
      {!readOnly && <div><Button sm icon={Plus} onClick={() => onChange([...rows, { sno: rows.length + 1, current: '', proposed: '', justification: '' }])}>Add row</Button> <span className="help">One change per row. Use the expand icon for long text.</span></div>}
      {big && <Modal wide title={`Row ${big.i + 1} – ${labels[big.k]}`} onClose={() => setBig(null)} footer={<Button variant="primary" onClick={() => setBig(null)}>Done</Button>}><TextArea style={{ minHeight: 260 }} autoFocus value={rows[big.i][big.k]} onChange={(e) => set(big.i, big.k, e.target.value)} /></Modal>}
    </div>
  );
}
