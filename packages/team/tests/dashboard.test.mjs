import { describe, expect, it } from 'vitest';
import { buildDashboard, openDisagreements, parseRoomLog } from '../src/dashboard.mjs';

describe('parseRoomLog', () => {
  it('reads "<date> <name> -> <to>: <text>" lines and skips the rest', () => {
    const text = '# heading\n2026-11-28 Egg -> room: hello there\n2026-11-28 Jon: no arrow\n  2026-11-29 board counsel (pending) -> Matt: a: b\nnot a line';
    expect(parseRoomLog(text)).toEqual([
      { date: '2026-11-28', from: 'Egg', to: 'room', text: 'hello there' },
      { date: '2026-11-29', from: 'board counsel (pending)', to: 'Matt', text: 'a: b' },
    ]);
  });
});

describe('openDisagreements', () => {
  const e = (from, text) => ({ date: '2026-11-30', from, to: 'room', text });
  it('keeps a disagreement until a later line settles it and names the speaker', () => {
    const a = e('Egg', 'I disagree with Dunk on layer');
    expect(openDisagreements([a])).toEqual([a]);
    expect(openDisagreements([a, e('Tyrion', 'resolved: Egg was right')])).toEqual([]);
    expect(openDisagreements([a, e('Tyrion', 'Agreed with Egg')])).toEqual([]);
    expect(openDisagreements([a, e('Tyrion', 'settled for Egg')])).toEqual([]);
    expect(openDisagreements([a, e('Tyrion', 'resolved: other thing')])).toEqual([a]);
    expect(openDisagreements([e('Tyrion', 'resolved: Egg'), a])).toEqual([a]);
    expect(openDisagreements([a, e('Tyrion', 'unresolved Egg')])).toEqual([a]);
    expect(openDisagreements([e('Egg', 'all good')])).toEqual([]);
  });
});

describe('buildDashboard', () => {
  const scores = [
    { set: 'sre-v1', score: 100, date: '2026-11-28T19:44Z' },
    { set: 'sre-v2', score: 80, date: '2026-11-29T19:44Z' },
    { set: 'sre-v2', score: 96, date: '2026-11-30T19:44Z', planted_found: 'yes' },
    { set: 'tester-v1', score: 100, date: '2026-11-28T19:42Z' },
  ];
  const log = [
    { date: '2026-11-30T12:00Z', role: 'sre', minutes: 4, cost_usd: 0.2, confirmed: 1 },
    { date: '2026-12-01T12:00Z', role: 'sre', minutes: 6.04, cost_usd: 0.334 },
    { date: '2026-12-01T12:00Z', role: 'tester', minutes: 3 },
    { date: '2026-11-28T12:00Z', role: 'tester', minutes: 9 },
    { date: '2026-12-01T12:00Z', role: 'home-companion', minutes: 50, cost_usd: 9 },
  ];
  const d = buildDashboard({ scores, log, room: [{ date: 'd', from: 'Egg', to: 'room', text: 'disagree' }], now: 'NOW' });
  it('lists each role with standing, rung and last run', () => {
    expect(d.built).toBe('NOW');
    expect(d.roles.map((r) => [r.role, r.status, r.rung, r.rungName, r.lastRun])).toEqual([
      ['sre', 'graduated', 1, 'comment', '2026-12-01T12:00Z'],
      ['tester', 'training', 0, 'supervised', '2026-12-01T12:00Z'],
    ]);
    expect(d.roles[0].rungWhy).toMatch(/^needs 5\+ reviewed/);
  });
  it('has no alarm when a set only rises', () => {
    expect(d.alarms).toEqual([]);
  });
  it('shows open disagreements', () => {
    expect(d.disagreements).toEqual([{ date: 'd', from: 'Egg', to: 'room', text: 'disagree' }]);
  });
  it("sums this week's spend, leaving the home companion out", () => {
    expect(d.spend).toMatchObject({ week: '2026-W49', runs: 3, minutes: 13, cost_usd: 0.53 });
    expect(d.spend.byRole.map((r) => r.role)).toEqual(['sre', 'tester']);
  });
  it('shows unknown spend as null, and handles an empty log', () => {
    const e = buildDashboard({ scores, log: [{ date: '2026-12-01', role: 'tester', minutes: 1 }], now: 'x' });
    expect(e.spend.cost_usd).toBeNull();
    const none = buildDashboard({ scores: [], log: [], now: 'x' });
    expect(none).toEqual({ built: 'x', roles: [], alarms: [], disagreements: [], spend: { week: null, runs: 0, minutes: 0, cost_usd: null, byRole: [] } });
  });
  it('reports a drift alarm', () => {
    const s = [...scores, { set: 'tester-v1', score: 85, date: '2026-12-01T00:00Z' }];
    expect(buildDashboard({ scores: s, log: [], now: 'x' }).alarms).toEqual(['tester: tester-v1: 100 → 85 (2026-12-01T00:00Z)']);
  });
});
