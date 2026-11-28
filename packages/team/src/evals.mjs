// Eval scoring and score history for the agent team (OCR-247, with OCR-242).
//
// The case sets and answer keys stay private (the owner's project files,
// team/evals/<set>/). This module holds only the formula and the rules, so
// they are tested and mutation-checked here, and every run scores the same way.
//
// Formula (unchanged from team/evals/score.py, so old and new scores compare):
//   score = round(100 * (caught + clean - false_alarms) / (gaps + clean))
// with Python's rounding (half to even). An answer names an item per line:
// "GAP: case-a:AC1" or "FINDING: case-a:AC1".
//
// Planted bug: a key may name one item under "planted". It also sits in
// "gaps", so it counts toward the score; planted_found says whether the
// answer caught it.

const ANSWER_RE = /^(?:GAP|FINDING):\s*(case-[a-z]:[A-Z]+\d+)\s*$/gm;

/** Python's round(): half to even. */
export function roundHalfEven(x) {
  const f = Math.floor(x);
  const diff = x - f;
  if (Math.abs(diff - 0.5) < 1e-9) return f % 2 === 0 ? f : f + 1;
  return Math.round(x);
}

/** Round to `n` places, as Python's round(x, n) does for the values we use. */
function round(x, n) {
  const k = 10 ** n;
  return roundHalfEven(x * k) / k;
}

/** The set of items an answer names. */
export function parseAnswer(text) {
  return new Set([...text.matchAll(ANSWER_RE)].map((m) => m[1]));
}

/**
 * Score one answer against one key.
 * @param {string} answer the agent's answer text
 * @param {{gaps: object|string[], clean: string[], planted?: string}} key
 */
export function scoreAnswer(answer, key) {
  const said = parseAnswer(answer);
  const gaps = new Set(Array.isArray(key.gaps) ? key.gaps : Object.keys(key.gaps));
  const clean = new Set(key.clean);
  const caught = [...said].filter((i) => gaps.has(i)).length;
  const falseAlarmItems = [...said].filter((i) => clean.has(i)).sort();
  const falseAlarms = falseAlarmItems.length;
  const n = gaps.size + clean.size;
  const precision = caught + falseAlarms ? caught / (caught + falseAlarms) : 0;
  const recall = gaps.size ? caught / gaps.size : 0;
  let plantedFound = null;
  if (key.planted) plantedFound = said.has(key.planted) ? 'yes' : 'no';
  return {
    score: n ? roundHalfEven((100 * (caught + clean.size - falseAlarms)) / n) : 0,
    caught,
    missed: gaps.size - caught,
    false_alarms: falseAlarms,
    recall: round(recall, 3),
    precision: round(precision, 3),
    planted_found: plantedFound,
    missed_items: [...gaps].filter((i) => !said.has(i)).sort(),
    false_alarm_items: falseAlarmItems,
  };
}

// Set-name prefixes (tester-v2, ds-v1) mapped to role-card ids.
const SET_ROLES = {
  tester: 'tester',
  sre: 'sre',
  ds: 'data-scientist',
  po: 'product-owner',
  arch: 'architect',
  int: 'integrator',
  be: 'back-end',
  fe: 'front-end',
  des: 'designer',
};

/** "ds-v2" → { role: "data-scientist", version: 2 }; null when the name has no -vN. */
export function parseSet(name) {
  const m = /^([a-z]+)-v(\d+)$/.exec(name ?? '');
  if (!m) return null;
  return { role: SET_ROLES[m[1]] ?? m[1], version: Number(m[2]) };
}

/** Parse ndjson text, skipping blank lines. Bad lines are returned separately. */
export function parseLines(text) {
  const rows = [];
  const bad = [];
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      rows.push(JSON.parse(line));
    } catch {
      bad.push(i + 1);
    }
  });
  return { rows, bad };
}

/** Score lines grouped by role, oldest first, with set and version attached. */
export function history(scoreRows) {
  const byRole = {};
  for (const r of scoreRows) {
    const set = parseSet(r.set);
    if (!set || typeof r.score !== 'number') continue;
    (byRole[set.role] ??= []).push({ ...r, version: set.version });
  }
  for (const rows of Object.values(byRole)) rows.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  return byRole;
}

export const DRIFT_DROP = 10;
export const GRADUATE_AT = 90;
export const DEMOTE_BELOW = 80;
export const DEMOTE_DAYS = 14;
const DAY_MS = 86_400_000;

/**
 * Drift alarms for one role's runs (oldest first):
 * - a drop of DRIFT_DROP or more points between two runs of the same set;
 * - the planted bug missed on two runs in a row.
 */
export function driftAlarms(runs) {
  const alarms = [];
  const lastBySet = {};
  let missedInRow = 0;
  for (const r of runs) {
    const prev = lastBySet[r.set];
    if (prev && prev.score - r.score >= DRIFT_DROP) {
      alarms.push(`${r.set}: ${prev.score} → ${r.score} (${r.date})`);
    }
    lastBySet[r.set] = r;
    if (r.planted_found === 'no') {
      missedInRow += 1;
      if (missedInRow === 2) alarms.push(`planted bug missed twice in a row (to ${r.date})`);
    } else if (r.planted_found === 'yes') {
      missedInRow = 0;
    }
  }
  return alarms;
}

/**
 * Where a role stands (OCR-242 graduation rules):
 * - "supervised": below DEMOTE_BELOW on every run for DEMOTE_DAYS or more
 *   (the current streak of low runs spans at least that long);
 * - "graduated": GRADUATE_AT or more on its latest run of each of the two
 *   highest set versions it has run;
 * - "training": otherwise.
 */
export function standing(runs) {
  if (runs.length === 0) return { status: 'training', why: 'no scored runs' };
  let streakStart = null;
  for (const r of runs) {
    if (r.score < DEMOTE_BELOW) streakStart ??= r;
    else streakStart = null;
  }
  const last = runs[runs.length - 1];
  if (streakStart) {
    const days = (Date.parse(last.date) - Date.parse(streakStart.date)) / DAY_MS;
    if (days >= DEMOTE_DAYS) return { status: 'supervised', why: `below ${DEMOTE_BELOW} since ${streakStart.date}` };
  }
  const latestByVersion = {};
  for (const r of runs) latestByVersion[r.version] = r;
  const versions = Object.keys(latestByVersion).map(Number).sort((a, b) => b - a).slice(0, 2);
  if (versions.length === 2 && versions.every((v) => latestByVersion[v].score >= GRADUATE_AT)) {
    return { status: 'graduated', why: `v${versions[1]} ${latestByVersion[versions[1]].score}, v${versions[0]} ${latestByVersion[versions[0]].score}` };
  }
  return { status: 'training', why: `needs ${GRADUATE_AT}+ on two set versions` };
}

/** One line per role: latest score, trend, standing and alarms. */
export function report(scoreRows) {
  const out = [];
  for (const [role, runs] of Object.entries(history(scoreRows)).sort(([a], [b]) => a.localeCompare(b))) {
    const last = runs[runs.length - 1];
    const s = standing(runs);
    out.push({
      role,
      runs: runs.length,
      latest: `${last.set} ${last.score}`,
      trend: runs.map((r) => r.score),
      status: s.status,
      why: s.why,
      alarms: driftAlarms(runs),
    });
  }
  return out;
}
