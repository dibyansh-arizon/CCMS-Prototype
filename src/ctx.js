import { userById } from './data/people.js';
import { isoDate } from './engine.js';

export const SETTINGS_DEFAULT = { clientGate: 'before_approval', defaultDueDays: 60 };

// Build the engine context for a signed-in user (includes active delegations)
export function makeCtx(user, { delegations = [], settings = SETTINGS_DEFAULT, counters, now = new Date(), signature = null } = {}) {
  const today = isoDate(now);
  const eff = [user.id];
  const effUsers = [user];
  delegations
    .filter((d) => d.toId === user.id && d.status === 'Active' && d.start <= today && d.end >= today)
    .forEach((d) => {
      const from = userById(d.fromId);
      if (from) {
        eff.push(from.id);
        effUsers.push(from);
      }
    });
  return {
    user, eff, effUsers, now, settings, signature, onBehalfOf: null,
    issueNumber: () => {
      const yy = String(now.getFullYear()).slice(2);
      counters.cc[yy] = (counters.cc[yy] || 0) + 1;
      return `CC${yy}${String(counters.cc[yy]).padStart(3, '0')}`;
    },
    nextDraft: () => {
      counters.draft += 1;
      return `DRAFT-${String(counters.draft).padStart(4, '0')}`;
    },
  };
}

// Name of the person being acted for (if the user is acting as a delegate)
export function onBehalfName(ctx, rec, key) {
  const delegators = ctx.eff.slice(1);
  if (!delegators.length) return null;
  const { DEPT_HEAD } = ctx_deps;
  if (rec.status === 'Pending Department Head Endorsement' && delegators.includes(DEPT_HEAD[rec.department])) return userById(DEPT_HEAD[rec.department]).name;
  if (key) {
    const a = rec.assessments.find((x) => x.key === key);
    const hit = a?.assignees.find((id) => delegators.includes(id) && id !== ctx.user.id);
    if (hit) return userById(hit).name;
  }
  return null;
}
import { DEPT_HEAD } from './data/people.js';
const ctx_deps = { DEPT_HEAD };
