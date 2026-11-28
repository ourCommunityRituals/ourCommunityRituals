import { describe, expect, it } from 'vitest';
import { checkRun, guardCommand, MAX_TRIES, STOP_AT_BUDGET_TIMES } from '../src/guard.mjs';

describe('checkRun', () => {
  it('goes on inside the budget', () => {
    expect(checkRun({ budgetMinutes: 60, elapsedMinutes: 59 })).toEqual({ stop: false, warn: [], reasons: [] });
    expect(checkRun({})).toEqual({ stop: false, warn: [], reasons: [] });
  });
  it('warns at the budget and stops at twice it', () => {
    expect(STOP_AT_BUDGET_TIMES).toBe(2);
    expect(checkRun({ budgetMinutes: 60, elapsedMinutes: 60 })).toEqual({ stop: false, warn: ['past the 60 min budget'], reasons: [] });
    expect(checkRun({ budgetMinutes: 60, elapsedMinutes: 119 }).stop).toBe(false);
    expect(checkRun({ budgetMinutes: 60, elapsedMinutes: 120 })).toEqual({
      stop: true,
      warn: [],
      reasons: ['at 120 min, twice the 60 min budget: stop and report done and left'],
    });
  });
  it('ignores a missing or zero budget', () => {
    expect(checkRun({ budgetMinutes: 0, elapsedMinutes: 500 }).stop).toBe(false);
    expect(checkRun({ elapsedMinutes: 500 }).stop).toBe(false);
  });
  it('stops at the third failed try, not the second', () => {
    expect(MAX_TRIES).toBe(3);
    expect(checkRun({ failedTries: { 'test a': 2 } }).stop).toBe(false);
    expect(checkRun({ failedTries: { 'test a': 3, 'test b': 1 } }).reasons).toEqual([
      '3 failed tries at test a: stop, report the error and the next idea',
    ]);
  });
  it('stops at the spend cap, including a cap of 0', () => {
    expect(checkRun({ spentUsd: 4.99, capUsd: 5 }).stop).toBe(false);
    expect(checkRun({ spentUsd: 5, capUsd: 5 }).reasons).toEqual(['spent $5 of a $5 cap']);
    expect(checkRun({ capUsd: 0 }).reasons).toEqual(['spent $0 of a $0 cap']);
    expect(checkRun({ spentUsd: 100, capUsd: null }).stop).toBe(false);
    expect(checkRun({ spentUsd: 100 }).stop).toBe(false);
  });
  it('stops at the turn limit', () => {
    expect(checkRun({ turns: 29, maxTurns: 30 }).stop).toBe(false);
    expect(checkRun({ turns: 30, maxTurns: 30 }).reasons).toEqual(['30 turns, limit 30']);
    expect(checkRun({ maxTurns: 0, turns: 99 }).stop).toBe(false);
    expect(checkRun({ maxTurns: 1 }).stop).toBe(false);
  });
});

describe('guardCommand', () => {
  it('uses the manifest deny list', () => {
    const m = { deny: { merge: ['gh pr merge'] }, roles: { sre: { tools: ['Bash'], commands: ['gh'] } } };
    expect(guardCommand(m, 'sre', 'gh pr merge 1')).toEqual({ ok: false, reason: 'denied: merge' });
    expect(guardCommand(m, 'sre', 'gh run list').ok).toBe(true);
  });
});
