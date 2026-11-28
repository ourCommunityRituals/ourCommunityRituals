// Data for the team dashboard (OCR-251): one object the page renders.
// Built from the score history, the run log and the Team room log. Shows
// functionality only, never named targets. The home companion is left out.

import { report } from './evals.mjs';
import { rollup, EXCLUDED_ROLES } from './cost.mjs';
import { rung } from './trust.mjs';
import { history } from './evals.mjs';

// Room log line: "<date> <name> -> <name|room>: <text>"
const ROOM_RE = /^(\d{4}-\d{2}-\d{2}\S*)\s+(.+?)\s+->\s+(.+?):\s+(.*)$/;

/** Parse the Team room log into entries; other lines are skipped. */
export function parseRoomLog(text) {
  const out = [];
  for (const line of text.split('\n')) {
    const m = ROOM_RE.exec(line.trim());
    if (m) out.push({ date: m[1], from: m[2], to: m[3], text: m[4] });
  }
  return out;
}

/**
 * Open disagreements: an entry whose text says "disagree" with no later entry
 * from anyone that says "resolved" or "agreed" and names the same first speaker.
 */
export function openDisagreements(entries) {
  const open = [];
  entries.forEach((e, i) => {
    if (!/disagree/i.test(e.text)) return;
    const closed = entries.slice(i + 1).some((l) => /\b(resolved|agreed|settled)\b/i.test(l.text) && l.text.includes(e.from));
    if (!closed) open.push(e);
  });
  return open;
}

/**
 * @param {object} input
 * @param {Array} input.scores  score lines
 * @param {Array} input.log     run-log lines
 * @param {Array} [input.room]  parsed room entries
 * @param {string} input.now    ISO date of the build
 */
export function buildDashboard({ scores, log, room = [], now }) {
  const evals = history(scores);
  const runs = log.filter((r) => !EXCLUDED_ROLES.includes(r.role));
  const roles = report(scores).map((r) => {
    const mine = runs.filter((x) => x.role === r.role);
    const last = mine.map((x) => x.date ?? x.ts).sort().pop() ?? null;
    const t = rung({ runs: mine, evals: evals[r.role] });
    return { ...r, rung: t.rung, rungName: t.name, rungWhy: t.why, lastRun: last };
  });
  const cost = rollup(runs);
  const week = cost.length ? cost[cost.length - 1].week : null;
  const thisWeek = cost.filter((c) => c.week === week);
  return {
    built: now,
    roles,
    alarms: roles.flatMap((r) => r.alarms.map((a) => `${r.role}: ${a}`)),
    disagreements: openDisagreements(room),
    spend: {
      week,
      runs: thisWeek.reduce((a, c) => a + c.runs, 0),
      minutes: Math.round(thisWeek.reduce((a, c) => a + c.minutes, 0) * 10) / 10,
      cost_usd: thisWeek.some((c) => c.cost_usd !== null) ? Math.round(thisWeek.reduce((a, c) => a + (c.cost_usd ?? 0), 0) * 100) / 100 : null,
      byRole: thisWeek,
    },
  };
}
