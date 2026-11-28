import { describe, expect, it } from 'vitest';
import { burnRate, evaluateSlo, targetFor, validateSlos, type SloSpec } from '../src';

const browse: SloSpec = {
  id: 'ose.browse_events',
  doc: 'People can list and open public events.',
  service: 'ose',
  ops: ['GET /api/v2/events', 'GET /api/v2/events/:x'],
  sli: { kind: 'availability' },
  target: 0.995,
};

describe('validateSlos', () => {
  it('accepts a good SLO and refuses bad ones with every reason', () => {
    expect(() => validateSlos([browse])).not.toThrow();
    let msg = '';
    try {
      validateSlos([
        browse,
        { ...browse },
        { ...browse, id: 'loose', target: 0.5 },
        { ...browse, id: 'raw', ops: ['GET /api/v2/events?brand=x'] },
        { ...browse, id: 'slow', sli: { kind: 'latency', thresholdMs: 0 } },
        { ...browse, id: 'long', windowDays: 365 },
      ]);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/duplicate id/);
    expect(msg).toMatch(/"loose": target must be from 0.9/);
    expect(msg).toMatch(/is not a route pattern/);
    expect(msg).toMatch(/latency threshold/);
    expect(msg).toMatch(/window must be 1 to 90 days/);
  });
});

describe('targetFor', () => {
  it('lets a client be stricter, never looser', () => {
    expect(targetFor(browse)).toBe(0.995);
    expect(targetFor(browse, 0.999)).toBe(0.999);
    expect(targetFor(browse, 0.99)).toBe(0.995);
    expect(targetFor(browse, 1)).toBe(0.995);
    expect(targetFor(browse, Number.NaN)).toBe(0.995);
  });
});

describe('evaluateSlo', () => {
  it('reports SLI, budget and what is left', () => {
    const s = evaluateSlo(browse, { good: 9_970, total: 10_000 });
    expect(s.sli).toBeCloseTo(0.997);
    expect(s.budget).toBeCloseTo(50);
    expect(s.budget_remaining).toBeCloseTo(0.4);
    expect(s.met).toBe(true);
  });

  it('goes below zero when the budget is overspent', () => {
    const s = evaluateSlo(browse, { good: 9_900, total: 10_000 });
    expect(s.met).toBe(false);
    expect(s.budget_remaining).toBeCloseTo(-1);
  });

  it('says nothing about a window with no traffic', () => {
    expect(evaluateSlo(browse, { good: 0, total: 0 })).toMatchObject({ sli: null, met: null, budget_remaining: null });
  });

  it('uses a stricter client target when given one', () => {
    const s = evaluateSlo(browse, { good: 9_970, total: 10_000 }, 0.999);
    expect(s.target).toBe(0.999);
    expect(s.met).toBe(false);
  });
});

describe('burnRate', () => {
  it('is 1 when errors spend the budget evenly, 14.4 for the fast-burn page', () => {
    expect(burnRate(0.995, { good: 995, total: 1000 })).toBeCloseTo(1);
    expect(burnRate(0.999, { good: 98_560, total: 100_000 })).toBeCloseTo(14.4);
    expect(burnRate(0.999, { good: 0, total: 0 })).toBeNull();
  });
});
