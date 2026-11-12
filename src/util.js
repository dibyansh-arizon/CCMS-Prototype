export const cx = (...a) => a.filter(Boolean).join(' ');
const D = (v) => (v ? new Date(v) : null);
export const fmtDate = (v) => (v ? D(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const fmtDateTime = (v) =>
  v ? `${D(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${D(v).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : '—';
export const daysFrom = (v, now = new Date()) => (v ? Math.round((new Date(v + 'T00:00:00Z') - new Date(now.toISOString().slice(0, 10) + 'T00:00:00Z')) / 86400000) : null);
export const initials = (name) => name.replace(/^Dr\.\s*/, '').split(' ').map((p) => p[0]).slice(0, 2).join('');

export function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = rows.map((r) => r.map(esc).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
