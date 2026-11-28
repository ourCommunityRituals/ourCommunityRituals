// Cost and time per run and per confirmed finding (OCR-250).
// Rolls up the run log per role and ISO week. Runs on the owner's plan log
// minutes and tokens with no dollar cost; API runs log dollars too. A role's
// dollar total is null, never 0, when none of its runs logged a cost.

export const EXCLUDED_ROLES = ['home-companion', 'home'];

/** ISO week id, "2026-W48", for a date string. */
export function isoWeek(date) {
  const d = new Date(Date.parse(date));
  const day = (d.getUTCDay() + 6) % 7; // Monday 0
  d.setUTCDate(d.getUTCDate() - day + 3); // the week's Thursday
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d - jan4) / 86_400_000 - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

const sum = (rows, k) => rows.reduce((a, r) => a + (typeof r[k] === 'number' ? r[k] : 0), 0);
const div = (a, b) => (a === null || !b ? null : Math.round((a / b) * 100) / 100);

/** One row per role and week, sorted by week then role. */
export function rollup(lines, { exclude = EXCLUDED_ROLES } = {}) {
  const groups = new Map();
  for (const r of lines) {
    const date = r.date ?? r.ts;
    if (!r.role || !date || Number.isNaN(Date.parse(date)) || exclude.includes(r.role)) continue;
    const key = `${isoWeek(date)} ${r.role}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const out = [];
  for (const [key, rows] of groups) {
    const [week, role] = key.split(' ');
    const costed = rows.filter((r) => typeof r.cost_usd === 'number');
    const cost = costed.length ? Math.round(sum(costed, 'cost_usd') * 100) / 100 : null;
    const confirmed = sum(rows, 'confirmed');
    const minutes = Math.round(sum(rows, 'minutes') * 10) / 10;
    out.push({
      week,
      role,
      runs: rows.length,
      minutes,
      tokens: sum(rows, 'tokens'),
      cost_usd: cost,
      runs_without_cost: rows.length - costed.length,
      found: sum(rows, 'found'),
      confirmed,
      cost_per_confirmed: div(cost, confirmed),
      minutes_per_confirmed: div(minutes, confirmed),
    });
  }
  return out.sort((a, b) => a.week.localeCompare(b.week) || a.role.localeCompare(b.role));
}
