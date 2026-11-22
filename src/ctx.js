import { isoDate } from './engine.js';
export const SETTINGS_DEFAULT = {
  clientGate: 'pending', // OPEN DECISION: 'pending' (not enforced) | 'before_approval' | 'implementation'
  defaultDueDays: 60,
};
export function makeCtx(user, { settings = SETTINGS_DEFAULT, counters, now = new Date(), signature = null } = {}) {
  void isoDate;
  return {
    user, eff: [user.id], effUsers: [user], now, settings, signature, onBehalfOf: null,
    issueNumber: () => { const yy = String(now.getFullYear()).slice(2); counters.cc[yy] = (counters.cc[yy] || 0) + 1; return `CC${yy}${String(counters.cc[yy]).padStart(3, '0')}`; },
    nextDraft: () => { counters.draft += 1; return `DRAFT-${String(counters.draft).padStart(4, '0')}`; },
  };
}
export const onBehalfName = () => null;
