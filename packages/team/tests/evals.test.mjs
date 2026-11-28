import { describe, expect, it } from 'vitest';
import {
  DEMOTE_BELOW,
  DEMOTE_DAYS,
  DRIFT_DROP,
  GRADUATE_AT,
  driftAlarms,
  history,
  parseAnswer,
  parseLines,
  parseSet,
  report,
  roundHalfEven,
  scoreAnswer,
  standing,
} from '../src/evals.mjs';

const KEY = {
  gaps: { 'case-a:AC1': 'why', 'case-b:AC2': 'why', 'case-c:AC1': 'why' },
  clean: ['case-a:AC2', 'case-b:AC1', 'case-d:AC1', 'case-d:AC2', 'case-e:AC1'],
};

describe('roundHalfEven (same as Python round)', () => {
  it.each([
    [0.5, 0], [1.5, 2], [2.5, 2], [3.5, 4], [92.5, 92], [93.5, 94], [92.4, 92], [92.6, 93], [7, 7], [-1.5, -2], [-2.5, -2],
  ])('round(%s) = %s', (x, want) => {
    expect(roundHalfEven(x)).toBe(want);
  });
});

describe('parseAnswer', () => {
  it('reads GAP and FINDING lines only, whole-line, deduplicated', () => {
    const a = 'GAP: case-a:AC1\nFINDING: case-b:AC2 \nGAP: case-a:AC1\nnote GAP: case-c:AC1\nGAP: case-c:AC1 extra\nGAP: NONE\ngap: case-d:AC1';
    expect([...parseAnswer(a)]).toEqual(['case-a:AC1', 'case-b:AC2']);
  });
});

describe('scoreAnswer', () => {
  it('scores a perfect answer 100', () => {
    const r = scoreAnswer('GAP: case-a:AC1\nGAP: case-b:AC2\nGAP: case-c:AC1', KEY);
    expect(r).toMatchObject({ score: 100, caught: 3, missed: 0, false_alarms: 0, recall: 1, precision: 1, planted_found: null });
  });
  it('counts a miss and a false alarm with the score.py formula', () => {
    // (2 caught + 5 clean - 1 false alarm) / 8 = 75
    const r = scoreAnswer('GAP: case-a:AC1\nGAP: case-b:AC2\nGAP: case-d:AC1', KEY);
    expect(r).toEqual({
      score: 75,
      caught: 2,
      missed: 1,
      false_alarms: 1,
      recall: 0.667,
      precision: 0.667,
      planted_found: null,
      missed_items: ['case-c:AC1'],
      false_alarm_items: ['case-d:AC1'],
    });
  });
  it('rounds half to even like Python: 13 of 14 is 92.86, 37 of 40 is 92.5 → 92', () => {
    const k = { gaps: ['case-a:AC1', 'case-a:AC2', 'case-a:AC3'], clean: Array.from({ length: 37 }, (_, i) => `case-z:AC${i + 1}`) };
    const r = scoreAnswer('GAP: case-a:AC1\nGAP: case-z:AC1\nGAP: case-z:AC2', k);
    // (1 + 37 - 2) / 40 = 90; then one more miss variant below
    expect(r.score).toBe(90);
    const r2 = scoreAnswer('GAP: case-a:AC1\nGAP: case-a:AC2\nGAP: case-z:AC1', k);
    // (2 + 37 - 1) / 40 = 95
    expect(r2.score).toBe(95);
    const k3 = { gaps: ['case-a:AC1', 'case-a:AC2'], clean: Array.from({ length: 38 }, (_, i) => `case-z:AC${i + 1}`) };
    // (1 + 38 - 2) / 40 = 92.5 → 92 (half to even)
    expect(scoreAnswer('GAP: case-a:AC1\nGAP: case-z:AC1\nGAP: case-z:AC2', k3).score).toBe(92);
    // (2 + 38 - 3) / 40 = 92.5 → 92 again; (1 + 38 - 1)/40 = 95
    expect(scoreAnswer('GAP: case-a:AC1\nGAP: case-z:AC1', k3).score).toBe(95);
  });
  it('gives 0 precision with nothing said and 0 recall with no gaps', () => {
    const r = scoreAnswer('GAP: NONE', KEY);
    // 5 of 8 = 62.5, half to even → 62
    expect(r).toMatchObject({ caught: 0, precision: 0, recall: 0, score: 62 });
    expect(scoreAnswer('GAP: case-a:AC1', { gaps: [], clean: ['case-a:AC1'] })).toMatchObject({ recall: 0, score: 0, false_alarms: 1 });
    expect(scoreAnswer('', { gaps: [], clean: [] }).score).toBe(0);
  });
  it('accepts gaps as a list or an object', () => {
    expect(scoreAnswer('GAP: case-a:AC1', { gaps: ['case-a:AC1'], clean: [] }).score).toBe(100);
  });
  it('reports the planted bug found or missed', () => {
    const k = { ...KEY, planted: 'case-c:AC1' };
    expect(scoreAnswer('GAP: case-c:AC1', k).planted_found).toBe('yes');
    expect(scoreAnswer('GAP: case-a:AC1', k).planted_found).toBe('no');
  });
});

describe('parseSet and parseLines', () => {
  it('maps set prefixes to roles', () => {
    expect(parseSet('ds-v2')).toEqual({ role: 'data-scientist', version: 2 });
    expect(parseSet('tester-v10')).toEqual({ role: 'tester', version: 10 });
    expect(parseSet('po-v1').role).toBe('product-owner');
    expect(parseSet('arch-v1').role).toBe('architect');
    expect(parseSet('int-v1').role).toBe('integrator');
    expect(parseSet('be-v1').role).toBe('back-end');
    expect(parseSet('fe-v1').role).toBe('front-end');
    expect(parseSet('des-v1').role).toBe('designer');
    expect(parseSet('sre-v1').role).toBe('sre');
    expect(parseSet('new-v1').role).toBe('new');
    expect(parseSet('tester')).toBeNull();
    expect(parseSet('Tester-v1')).toBeNull();
    expect(parseSet(undefined)).toBeNull();
  });
  it('skips blank lines and reports unreadable ones by line number', () => {
    expect(parseLines('{"a":1}\n\n2", broken\n{"b":2}\n')).toEqual({ rows: [{ a: 1 }, { b: 2 }], bad: [3] });
  });
});

const run = (set, score, date, extra = {}) => ({ set, score, date, ...extra });

describe('history', () => {
  it('groups by role, sorts oldest first, attaches version, skips unscored rows', () => {
    const h = history([
      run('ds-v2', 91, '2026-11-28T19:56Z'),
      run('ds-v1', 100, '2026-11-28T19:46Z'),
      run('nonsense', 50, '2026-11-28T19:00Z'),
      { set: 'sre-v1', date: '2026-11-28T19:00Z' },
    ]);
    expect(Object.keys(h)).toEqual(['data-scientist']);
    expect(h['data-scientist'].map((r) => [r.set, r.version])).toEqual([['ds-v1', 1], ['ds-v2', 2]]);
  });
});

describe('driftAlarms', () => {
  it('flags a drop of the threshold or more within one set', () => {
    expect(DRIFT_DROP).toBe(10);
    const runs = [run('sre-v1', 100, 'd1'), run('sre-v2', 80, 'd2'), run('sre-v1', 90, 'd3'), run('sre-v1', 81, 'd4')];
    expect(driftAlarms(runs)).toEqual(['sre-v1: 100 → 90 (d3)']);
  });
  it('does not compare across sets or flag a rise', () => {
    expect(driftAlarms([run('sre-v1', 60, 'd1'), run('sre-v1', 100, 'd2'), run('sre-v2', 50, 'd3')])).toEqual([]);
  });
  it('flags the planted bug missed twice in a row, once, and resets on a catch', () => {
    const p = (f, d) => run('sre-v1', 100, d, { planted_found: f });
    expect(driftAlarms([p('no', 'd1'), p('no', 'd2'), p('no', 'd3')])).toEqual(['planted bug missed twice in a row (to d2)']);
    expect(driftAlarms([p('no', 'd1'), p('yes', 'd2'), p('no', 'd3')])).toEqual([]);
    expect(driftAlarms([p('no', 'd1'), p(null, 'd2'), p('no', 'd3')])).toEqual(['planted bug missed twice in a row (to d3)']);
  });
});

describe('standing', () => {
  const day = (n) => new Date(Date.UTC(2026, 10, 1 + n)).toISOString();
  it('is training with no runs or one version', () => {
    expect(GRADUATE_AT).toBe(90);
    expect(standing([])).toEqual({ status: 'training', why: 'no scored runs' });
    expect(standing([{ ...run('sre-v1', 100, day(0)), version: 1 }]).status).toBe('training');
  });
  it('graduates on 90+ on the latest run of the two highest versions', () => {
    const runs = [
      { ...run('ds-v1', 100, day(0)), version: 1 },
      { ...run('ds-v2', 85, day(1)), version: 2 },
      { ...run('ds-v2', 90, day(2)), version: 2 },
    ];
    expect(standing(runs)).toEqual({ status: 'graduated', why: 'v1 100, v2 90' });
    runs.push({ ...run('ds-v3', 89, day(3)), version: 3 });
    expect(standing(runs).status).toBe('training');
  });
  it('is supervised after a low streak of DEMOTE_DAYS or more, not before', () => {
    expect([DEMOTE_BELOW, DEMOTE_DAYS]).toEqual([80, 14]);
    const low = (n, s = 70) => ({ ...run('sre-v2', s, day(n)), version: 2 });
    const hi = (n) => ({ ...run('sre-v1', 100, day(n)), version: 1 });
    expect(standing([hi(0), low(1), low(14)]).status).toBe('training');
    expect(standing([hi(0), low(1), low(15)])).toEqual({ status: 'supervised', why: `below 80 since ${day(1)}` });
    expect(standing([low(0), hi(5), low(19)]).status).toBe('training');
    expect(standing([hi(0), low(1, 80), low(20, 80)]).status).toBe('training');
  });
});

describe('report', () => {
  it('summarises each role, sorted', () => {
    const r = report([
      run('sre-v1', 100, '2026-11-28T19:44Z'),
      run('ds-v1', 100, '2026-11-28T19:46Z'),
      run('ds-v2', 91, '2026-11-28T19:56Z'),
    ]);
    expect(r).toEqual([
      { role: 'data-scientist', runs: 2, latest: 'ds-v2 91', trend: [100, 91], status: 'graduated', why: 'v1 100, v2 91', alarms: [] },
      { role: 'sre', runs: 1, latest: 'sre-v1 100', trend: [100], status: 'training', why: 'needs 90+ on two set versions', alarms: [] },
    ]);
  });
});
