// Downloadable Change Control reports: interim (any time) and final dossier (closed CCs).
import { ASSESSMENT_BY_KEY, VERSION } from './data/forms.js';
import { userById } from './data/people.js';

const e = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const d = (v) => (v ? new Date(v).toLocaleString('en-GB') : '—');
const dd = (v) => (v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const tbl = (head, rows) => `<table><thead><tr>${head.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}">None</td></tr>`}</tbody></table>`;

export function buildReport(rec, mode = 'interim') {
  const final = mode === 'final';
  const ans = (a) => Object.entries(a.answers || {}).filter(([k]) => !k.endsWith('Other')).map(([k, v]) => `${ASSESSMENT_BY_KEY[a.key].fields.find((f) => f.id === k)?.label || k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
  const sigs = rec.history.filter((h) => h.signature);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(rec.ccNumber || rec.draftId)} – ${final ? 'Final dossier' : 'Interim report'}</title>
<style>body{font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#1c2433;margin:32px}h1{font-size:20px;margin:0}h2{font-size:15px;border-bottom:2px solid #ff6900;padding-bottom:4px;margin-top:26px}table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #cdd3df;padding:6px 8px;text-align:left;vertical-align:top}th{background:#f3f5f9}.m{color:#667085;font-size:12px}.b{display:inline-block;padding:2px 10px;border-radius:99px;background:#e8f0fe;color:#175cd3;font-weight:600}</style></head><body>
<div class="m">Carnegie Pharma · Change Control Management System · ${e(VERSION.label)}</div>
<h1>${final ? 'Final Change Control Dossier' : 'Interim Change Control Report'} – ${e(rec.ccNumber || rec.draftId + ' (temporary ID)')}</h1>
<p><span class="b">${e(rec.status)}</span> &nbsp; Generated ${d(new Date())}${final ? ' · record is closed and locked' : ' · record is still in progress'}</p>
<h2>1. Change details</h2>${tbl(['Field', 'Value'], [['Title', rec.title], ['Type of change', rec.type === 'Other' ? `Other – ${rec.otherType}` : rec.type], ['Initiator / department', `${rec.initiatorName} · ${rec.department}`], ['Date requested', dd(rec.dateRequested)], ['Current / proposed document no.', `${rec.currentDoc || '—'} → ${rec.proposedDoc || '—'}`], ['CC issued', rec.ccNumber ? `${rec.ccNumber} by ${rec.issuedBy} on ${dd(rec.issuedAt)}` : 'Not yet issued'], ['QA approval / overall due date', rec.approvedAt ? `${dd(rec.approvedAt)} / ${dd(rec.dueDate)}` : '—'], ['Review rounds', rec.round || 1]])}
<h2>2. Changes (current state, proposed change, justification)</h2>${tbl(['S.No', 'Current State', 'Proposed Change', 'Justification'], rec.changes.map((c, i) => [i + 1, c.current, c.proposed, c.justification]))}
<h2>3. Departmental assessments</h2>${tbl(['Assessment', 'HOD', 'Outcome', 'Answers', 'Remarks'], rec.assessments.map((a) => [ASSESSMENT_BY_KEY[a.key].name, a.completedBy || '—', a.status, ans(a), a.comments]))}
${rec.assessments.some((a) => a.rounds?.length) ? '<h2>3a. Earlier review rounds (preserved)</h2>' + tbl(['Round', 'Assessment', 'Outcome', 'Answers', 'Signed by'], rec.assessments.flatMap((a) => (a.rounds || []).map((x) => [x.round, ASSESSMENT_BY_KEY[a.key].shortName, x.status, ans({ ...a, answers: x.answers }), x.completedBy || '—']))) : ''}
<h2>4. Regulatory and client approval</h2>${rec.reg ? tbl(['Item', 'Value'], [['ANDA/DMF status', rec.reg.andaStatus], ['Regulatory assessment', rec.reg.applicable], ['Reporting criteria', (rec.reg.reporting || []).join('; ') || '—'], ['Regulatory action required', rec.reg.regActionRequired ? 'Yes' : 'No'], ['Client approval', rec.reg.clientRequired ? `Required – ${rec.reg.clientName}${rec.reg.clientEvidence ? ' (signed evidence on file)' : ' (evidence pending)'}` : 'Not required']]) : '<p>Not yet assessed.</p>'}
<h2>5. Action items</h2>${tbl(['ID', 'Source', 'Action', 'Owner', 'Target date', 'Status', 'Completion comment'], rec.actions.map((a) => [a.id, a.source, a.description, userById(a.ownerId)?.name, dd(a.due) + (a.originalDue ? ` (orig. ${dd(a.originalDue)})` : ''), a.status, a.comment]))}
<h2>6. Extensions and amendments</h2>${tbl(['Ref', 'Detail', 'Route / decisions', 'Status'], [...rec.extensions.map((x) => [x.id, `Extension no. ${x.level}: +${x.days} days – ${x.reason}`, x.decisions.map((y) => `${y.label}: ${y.decision} (${y.by})`).join('; ') || 'In approval', x.status]), ...rec.amendments.map((x) => [x.id, `Amendment: ${x.description}`, x.comment || '', x.status])])}
<h2>7. Documents (all versions retained)</h2>${tbl(['Document', 'Type', 'Version', 'Stage', 'Uploaded by', 'Date', 'Current'], rec.attachments.map((a) => [a.name, a.kind, `v${a.version || 1}`, a.stage || '—', a.by, d(a.at), a.superseded ? 'Superseded' : 'Current']))}
${rec.risk ? `<h2>8. QA risk assessment and approval</h2><p>Approved by ${e(rec.risk.approvedBy || '—')} on ${dd(rec.approvedAt)}. ${e(rec.risk.comments || '')}</p>` : ''}
${final && rec.closeout ? `<h2>9. QA closeout</h2><p>Disposition: ${e(rec.closeout.disposition)} · closed by ${e(rec.closeout.by)} on ${dd(rec.closedAt)} · archive ref. ${e(rec.archiveRef || '—')}</p>` : ''}
<h2>10. Decisions and electronic signatures</h2>${tbl(['Date / time', 'Signed by', 'Role', 'Event', 'Meaning'], sigs.map((h) => [d(h.at), h.signature.signer, h.role, h.action, h.signature.meaning]))}
<h2>11. Activity history</h2>${tbl(['Date / time', 'User', 'Event', 'Detail'], rec.history.map((h) => [d(h.at), h.actor, h.action, h.detail]))}
<p class="m">Source: ${e(VERSION.source)}.</p></body></html>`;
}
export function downloadReport(rec, mode) {
  const blob = new Blob([buildReport(rec, mode)], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${rec.ccNumber || rec.draftId}-${mode === 'final' ? 'final-dossier' : 'interim-report'}.html`;
  a.click();
  URL.revokeObjectURL(a.href);
}
