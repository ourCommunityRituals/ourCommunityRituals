// Measured trust and the autonomy ladder (OCR-248).
//
// A role earns each rung by its record; nothing an agent says moves it.
// The rung is recomputed from the record every time, so a worse record moves
// a role down without anyone deciding to.
//
//   0 supervised     a person reads every report before anything happens
//   1 comment        may comment on PRs and in the Team room
//   2 file           may file Linear stories
//   3 draft PR       may open draft PRs that fix a check or a script
//   4 auto-merge     low-risk paths only, and only with the owner's yes for
//                    that role and Code Owners review switched on
//
// Rung 4 never covers security, data, migrations, workflows, governance files
// or the team's own manifest (autoMergeAllowed).

import { driftAlarms, standing } from './evals.mjs';

export const RUNGS = ['supervised', 'comment', 'file', 'draft PR', 'auto-merge (low risk)'];
export const FILE_MIN_REVIEWED = 5;
export const FILE_MIN_HIT = 0.8;
export const PR_MIN_REVIEWED = 15;
export const PR_MIN_HIT = 0.9;
export const PR_MIN_DAYS = 28;
const DAY_MS = 86_400_000;

/** Reviewed findings and hit rate from a role's run-log lines. */
export function record(runs) {
  let confirmed = 0;
  let rejected = 0;
  let first = null;
  let last = null;
  for (const r of runs) {
    confirmed += r.confirmed ?? 0;
    rejected += r.rejected ?? 0;
    const t = Date.parse(r.date ?? r.ts);
    if (!Number.isNaN(t)) {
      if (first === null || t < first) first = t;
      if (last === null || t > last) last = t;
    }
  }
  const reviewed = confirmed + rejected;
  return {
    confirmed,
    rejected,
    reviewed,
    hitRate: reviewed ? confirmed / reviewed : null,
    days: first === null ? 0 : (last - first) / DAY_MS,
  };
}

/**
 * The rung a role has earned.
 * @param {object} input
 * @param {Array} input.runs  the role's run-log lines
 * @param {Array} input.evals the role's score-history rows (evals.history()[role])
 * @param {boolean} [input.ownerApproved] the owner said yes to rung 4 for this role
 * @param {boolean} [input.codeOwnersOn]  Code Owners review is required on main
 */
export function rung({ runs, evals, ownerApproved = false, codeOwnersOn = false }) {
  const s = standing(evals);
  const rec = record(runs);
  const out = (n, why) => ({ rung: n, name: RUNGS[n], why, record: rec, standing: s.status });
  if (s.status !== 'graduated') return out(0, `evals: ${s.status} (${s.why})`);
  const alarms = driftAlarms(evals);
  if (rec.reviewed < FILE_MIN_REVIEWED || rec.hitRate < FILE_MIN_HIT) {
    return out(1, `needs ${FILE_MIN_REVIEWED}+ reviewed findings at ${FILE_MIN_HIT * 100}%+ (has ${rec.reviewed}, ${pct(rec.hitRate)})`);
  }
  if (rec.reviewed < PR_MIN_REVIEWED || rec.hitRate < PR_MIN_HIT || rec.days < PR_MIN_DAYS || alarms.length) {
    const why = alarms.length
      ? `eval alarm: ${alarms[0]}`
      : `needs ${PR_MIN_REVIEWED}+ reviewed at ${PR_MIN_HIT * 100}%+ over ${PR_MIN_DAYS}+ days (has ${rec.reviewed}, ${pct(rec.hitRate)}, ${Math.floor(rec.days)} days)`;
    return out(2, why);
  }
  if (!ownerApproved || !codeOwnersOn) {
    return out(3, ownerApproved ? 'auto-merge waits on Code Owners review being on' : "auto-merge needs the owner's yes for this role");
  }
  return out(4, 'earned, with the owner\'s yes and Code Owners on');
}

function pct(x) {
  return x === null ? 'no reviews' : `${Math.round(x * 100)}%`;
}

// Paths rung 4 may never merge on its own.
export const NEVER_AUTO_MERGE = [
  /^\.github\//,
  /(^|\/)CLAUDE\.md$/,
  /(^|\/)AGENTS\.md$/,
  /(^|\/)SKILL\.md$/,
  /(^|\/)docs\/adr\//,
  /(^|\/)ocr-docs-brain\//,
  /(^|\/)docs\/standards\//,
  /OCR_VISION\.md$/,
  /(^|\/)migrations[^/]*\//,
  /(^|\/)security\//,
  /(^|\/)\.claude\//,
  /^team\/tools\.json$/,
  /(^|\/)wrangler\.(toml|jsonc?)$/,
  /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json)$/,
  /(pii|forms-db|count-floor|auth|admin|secret|token|privacy)/i,
];

/** May rung 4 merge a change to these paths on its own? */
export function autoMergeAllowed(paths) {
  if (!paths.length) return { ok: false, blocked: [] };
  const blocked = paths.filter((p) => NEVER_AUTO_MERGE.some((re) => re.test(p)));
  return { ok: blocked.length === 0, blocked };
}
