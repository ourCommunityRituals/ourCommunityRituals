import { describe, expect, it } from 'vitest';
import { EXCLUDED_ROLES, isoWeek, rollup } from '../src/cost.mjs';

describe('isoWeek', () => {
  it.each([
    ['2026-11-28', '2026-W48'],
    ['2026-11-29T23:59Z', '2026-W48'],
    ['2026-11-30', '2026-W49'],
    ['2026-01-01', '2026-W01'],
    ['2027-01-01', '2026-W53'],
    ['2024-12-30', '2025-W01'],
    ['2021-01-03', '2020-W53'],
    ['2026-03-09', '2026-W11'],
  ])('%s is %s', (d, w) => {
    expect(isoWeek(d)).toBe(w);
  });
});

describe('rollup', () => {
  const lines = [
    { date: '2026-11-30T12:00Z', role: 'sre', minutes: 10, cost_usd: 0.5, tokens: 1000, found: 3, confirmed: 2 },
    { date: '2026-12-01T12:00Z', role: 'sre', minutes: 5.04, cost_usd: 0.255, tokens: 500, found: 1, confirmed: 1 },
    { date: '2026-12-02T12:00Z', role: 'sre', minutes: 2, tokens: 10, found: 0 },
    { date: '2026-11-30T12:00Z', role: 'tester', minutes: 3, found: 2 },
    { date: '2026-11-28T12:00Z', role: 'architect', minutes: 1 },
    { ts: '2026-11-30T12:00Z', role: 'home-companion', minutes: 99 },
    { date: 'never', role: 'sre', minutes: 99 },
    { date: '2026-11-30', minutes: 99 },
  ];
  it('groups per week and role, sorted, and leaves out the home companion and bad lines', () => {
    expect(EXCLUDED_ROLES).toContain('home-companion');
    const r = rollup(lines);
    expect(r.map((x) => `${x.week} ${x.role}`)).toEqual(['2026-W48 architect', '2026-W49 sre', '2026-W49 tester']);
  });
  it('sums, rounds and divides per confirmed finding', () => {
    expect(rollup(lines)[1]).toEqual({
      week: '2026-W49',
      role: 'sre',
      runs: 3,
      minutes: 17,
      tokens: 1510,
      cost_usd: 0.76,
      runs_without_cost: 1,
      found: 4,
      confirmed: 3,
      cost_per_confirmed: 0.25,
      minutes_per_confirmed: 5.67,
    });
  });
  it('reports unknown cost as null, never 0, and no per-finding figure without a confirmed finding', () => {
    expect(rollup(lines)[2]).toMatchObject({ cost_usd: null, runs_without_cost: 1, confirmed: 0, cost_per_confirmed: null, minutes_per_confirmed: null });
  });
  it('can include a role it would leave out', () => {
    expect(rollup(lines, { exclude: [] }).map((x) => x.role)).toContain('home-companion');
  });
  it('sorts by week first, then role', () => {
    const r = rollup([
      { date: '2026-12-08', role: 'a' },
      { date: '2026-12-01', role: 'b' },
      { date: '2026-12-01', role: 'a' },
    ]);
    expect(r.map((x) => `${x.week} ${x.role}`)).toEqual(['2026-W49 a', '2026-W49 b', '2026-W50 a']);
  });
});
