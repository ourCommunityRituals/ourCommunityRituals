import { describe, expect, it } from 'vitest';
import {
  createCardinalityGuard,
  DIMENSIONS,
  OTHER,
  validateMetrics,
  worstCaseSeries,
  type MetricRegistry,
} from '../src';

const metrics = {
  'http.requests': {
    doc: 'Requests served, by route, outcome and client.',
    labels: {
      service: DIMENSIONS.service,
      client: { kind: 'bounded', max: 3, shape: 'slug' },
      op: { kind: 'bounded', max: 10, shape: 'op' },
      outcome: { kind: 'enum', values: ['ok', 'client_error', 'server_error'] },
    },
    maxSeries: 11 * 4 * 11 * 4,
  },
} as const satisfies MetricRegistry;

describe('validateMetrics', () => {
  it('accepts a registry inside its budget', () => {
    expect(() => validateMetrics(metrics)).not.toThrow();
    expect(worstCaseSeries(metrics['http.requests'])).toBe(11 * 4 * 11 * 4);
  });

  it('refuses a metric whose worst case is over budget, with the arithmetic', () => {
    expect(() =>
      validateMetrics({
        'scan.count': {
          doc: 'Scans counted, by client and region.',
          labels: { client: DIMENSIONS.client, region: DIMENSIONS.region },
          maxSeries: 10_000,
        },
      })
    ).toThrow(/worst case 102051 series \(client 2001 × region 51\) is over its budget of 10000/);
  });

  it('refuses banned labels, including plan tier', () => {
    for (const label of ['event_id', 'ip', 'h3_cell', 'tier', 'user_id', 'timestamp']) {
      expect(() =>
        validateMetrics({ 'x.y': { doc: 'A probe metric for tests.', labels: { [label]: { kind: 'enum', values: ['a'] } } } })
      ).toThrow(/is banned/);
    }
  });

  it('refuses enum lists that are empty or list other, and unbounded maxima', () => {
    expect(() =>
      validateMetrics({
        'x.y': {
          doc: 'A probe metric for tests.',
          labels: {
            a: { kind: 'enum', values: [] },
            b: { kind: 'enum', values: ['other'] },
            c: { kind: 'bounded', max: 999_999, shape: 'slug' },
          },
        },
      })
    ).toThrow(/needs 1 to 64 values[\s\S]*may not list "other"[\s\S]*whole max from 1 to 5000/);
  });
});

describe('admit', () => {
  it('passes values inside budget unchanged', () => {
    const g = createCardinalityGuard(metrics);
    expect(
      g.admit('http.requests', { service: 'ose', client: 'fernbrook-parks', op: 'GET /api/v2/events/:x', outcome: 'ok' })
    ).toEqual({
      labels: { service: 'ose', client: 'fernbrook-parks', op: 'GET /api/v2/events/:x', outcome: 'ok' },
      folded: false,
    });
  });

  it('folds a value not in an enum to other', () => {
    const g = createCardinalityGuard(metrics);
    expect(g.admit('http.requests', { outcome: 'teapot' })?.labels.outcome).toBe(OTHER);
    expect(g.report().folds.not_in_list).toBe(1);
  });

  it('folds new values of a bounded label past its max, and keeps the ones already seen', () => {
    const g = createCardinalityGuard(metrics);
    for (const c of ['a-brand', 'b-brand', 'c-brand']) g.admit('http.requests', { client: c });
    expect(g.admit('http.requests', { client: 'd-brand' })?.labels.client).toBe(OTHER);
    expect(g.admit('http.requests', { client: 'b-brand' })?.labels.client).toBe('b-brand');
    const r = g.report();
    expect(r.folds.over_budget).toBe(1);
    expect(r.metrics['http.requests']?.labels.client).toEqual({ budget: 3, seen: 3, folded: 1 });
  });

  it('folds id-shaped and person-shaped values to other', () => {
    const g = createCardinalityGuard(metrics);
    for (const v of ['3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90', 'dana@example.com', 'brand-8f14e45fceea167a', 'Fernbrook Parks']) {
      expect(g.admit('http.requests', { client: v })?.labels.client).toBe(OTHER);
    }
    expect(g.admit('http.requests', { op: 'GET /api/v2/events/Spring Fair?x=1' })?.labels.op).toBe(OTHER);
    expect(g.report().folds.bad_shape).toBe(5);
  });

  it('drops undeclared labels and counts them', () => {
    const g = createCardinalityGuard(metrics);
    const a = g.admit('http.requests', { outcome: 'ok', event_id: 'evt-1', ip: '203.0.113.9' });
    expect(a?.labels).toEqual({ outcome: 'ok' });
    expect(a?.folded).toBe(true);
    expect(g.report().folds.undeclared).toBe(2);
  });

  it('returns null for an unknown metric and counts it', () => {
    const g = createCardinalityGuard(metrics);
    expect(g.admit('made.up', { a: 'b' })).toBeNull();
    expect(g.report().folds.unknown_metric).toBe(1);
  });

  it('counts distinct series', () => {
    const g = createCardinalityGuard(metrics);
    g.admit('http.requests', { outcome: 'ok', client: 'a' });
    g.admit('http.requests', { client: 'a', outcome: 'ok' });
    g.admit('http.requests', { outcome: 'server_error', client: 'a' });
    expect(g.report().metrics['http.requests']?.series_seen).toBe(2);
  });

  it('never exceeds the declared worst case, whatever is thrown at it', () => {
    const g = createCardinalityGuard(metrics);
    for (let i = 0; i < 5000; i++) {
      g.admit('http.requests', {
        service: ['ose', 'ow', 'nope'][i % 3],
        client: `client-${String(i)}`,
        op: `GET /api/:x/${String(i % 40)}`,
        outcome: ['ok', 'server_error', 'weird'][i % 3],
      });
    }
    const r = g.report().metrics['http.requests'];
    expect(r?.series_seen).toBeLessThanOrEqual(r?.worst_case ?? 0);
    expect(r?.labels.client?.seen).toBe(3);
    expect(r?.labels.op?.seen).toBe(10);
  });
});

describe('DIMENSIONS', () => {
  it('match the logger: same services and envs', async () => {
    const { SERVICES, ENVS } = await import('../src');
    expect([...DIMENSIONS.service.values]).toEqual([...SERVICES]);
    expect([...DIMENSIONS.env.values]).toEqual([...ENVS]);
  });
});
