import { describe, expect, it } from 'vitest';
import {
  createMetrics,
  DIMENSIONS,
  floorPeople,
  layoutFor,
  OTHER,
  validateMeteredMetrics,
  type AnalyticsEngineLike,
  type MeteredRegistry,
} from '../src';

type Point = Parameters<AnalyticsEngineLike['writeDataPoint']>[0];

function fakeDataset() {
  const points: Point[] = [];
  return { points, dataset: { writeDataPoint: (p: Point) => void points.push(p) } };
}

const metrics = {
  'http.requests': {
    doc: 'Requests served, by route, outcome and client.',
    labels: {
      op: { kind: 'bounded', max: 10, shape: 'op' },
      client: { kind: 'bounded', max: 3, shape: 'slug' },
      outcome: { kind: 'enum', values: ['ok', 'client_error', 'server_error'] },
    },
  },
  'http.duration': {
    doc: 'Time to serve a request, in milliseconds.',
    kind: 'histogram',
    unit: 'ms',
    labels: { op: { kind: 'bounded', max: 10, shape: 'op' } },
  },
  'scan.counted': {
    doc: 'Scans counted at events, by client and event type.',
    people: true,
    labels: {
      client: { kind: 'bounded', max: 3, shape: 'slug' },
      event_type: { kind: 'bounded', max: 5, shape: 'slug' },
      synthetic: DIMENSIONS.synthetic,
    },
  },
} as const satisfies MeteredRegistry;

function make(dataset?: AnalyticsEngineLike) {
  return createMetrics({ service: 'ose', env: 'staging', release: 'abc1234', metrics, dataset });
}

describe('createMetrics: the data point layout', () => {
  it('writes the metric as index1, the envelope as blob1-3 and labels in declared order', () => {
    const { points, dataset } = fakeDataset();
    make(dataset).count('http.requests', { op: 'GET /api/v2/events/:x', client: 'fernbrook-parks', outcome: 'ok' });
    expect(points).toEqual([
      {
        indexes: ['http.requests'],
        blobs: ['ose', 'staging', 'abc1234', 'GET /api/v2/events/:x', 'fernbrook-parks', 'ok'],
        doubles: [1],
      },
    ]);
    expect(layoutFor(metrics['http.requests'])).toEqual({
      service: 'blob1',
      env: 'blob2',
      release: 'blob3',
      op: 'blob4',
      client: 'blob5',
      outcome: 'blob6',
    });
  });

  it('writes null for a declared label the call left out', () => {
    const { points, dataset } = fakeDataset();
    make(dataset).count('http.requests', { outcome: 'ok' }, 3);
    expect(points[0]?.blobs).toEqual(['ose', 'staging', 'abc1234', null, null, 'ok']);
    expect(points[0]?.doubles).toEqual([3]);
  });

  it('records a histogram observation as double1', () => {
    const { points, dataset } = fakeDataset();
    make(dataset).observe('http.duration', 41.5, { op: 'GET /health' });
    expect(points[0]).toMatchObject({ indexes: ['http.duration'], doubles: [41.5] });
  });
});

describe('createMetrics: budgets and folding', () => {
  it('folds a label value past its budget to other and counts it', () => {
    const { points, dataset } = fakeDataset();
    const m = make(dataset);
    for (const c of ['a-brand', 'b-brand', 'c-brand', 'd-brand']) m.count('http.requests', { client: c, outcome: 'ok' });
    expect(points.map((p) => p.blobs?.[4])).toEqual(['a-brand', 'b-brand', 'c-brand', OTHER]);
    expect(m.stats().folded).toBe(1);
    expect(m.report().metrics['http.requests']?.labels.client).toEqual({ budget: 3, seen: 3, folded: 1 });
  });

  it('never writes an id-shaped client: a UUID becomes other', () => {
    const { points, dataset } = fakeDataset();
    make(dataset).count('http.requests', { client: '6f1c2a9e-0b7d-4c1e-9a55-3e2f8d7c6b5a', outcome: 'ok' });
    expect(points[0]?.blobs?.[4]).toBe(OTHER);
  });

  it('drops an undeclared label instead of writing it', () => {
    const { points, dataset } = fakeDataset();
    make(dataset).count('http.requests', { outcome: 'ok', email: 'someone@example.com' });
    expect(JSON.stringify(points)).not.toContain('example.com');
  });
});

describe('createMetrics: context dimensions', () => {
  it('fills declared dimensions from with(), and marks synthetic traffic', () => {
    const { points, dataset } = fakeDataset();
    const m = make(dataset).with({ client: 'fernbrook-parks', event_type: 'etr-rec-bocce', synthetic: true });
    m.count('scan.counted');
    expect(points[0]?.blobs).toEqual(['ose', 'staging', 'abc1234', 'fernbrook-parks', 'etr-rec-bocce', 'true']);
  });

  it('writes synthetic=false for real traffic, and a call cannot claim otherwise', () => {
    const { points, dataset } = fakeDataset();
    make(dataset).count('scan.counted', { client: 'fernbrook-parks' });
    make(dataset).with({ synthetic: true }).count('scan.counted', { synthetic: 'false' });
    expect(points[0]?.blobs?.[5]).toBe('false');
    expect(points[1]?.blobs?.[5]).toBe('true');
  });

  it('leaves out context dimensions the metric does not declare', () => {
    const { points, dataset } = fakeDataset();
    make(dataset).with({ client: 'fernbrook-parks', region: 'sw-chicago' }).observe('http.duration', 5);
    expect(points[0]?.blobs).toEqual(['ose', 'staging', 'abc1234', null]);
  });
});

describe('createMetrics: never throws, counts every drop', () => {
  it('drops unknown metrics, wrong kinds and bad values', () => {
    const { points, dataset } = fakeDataset();
    const m = make(dataset);
    m.count('no.such' as never);
    m.observe('http.requests', 5);
    m.count('http.requests', {}, -1);
    m.count('http.requests', {}, 1.5);
    m.observe('http.duration', Number.NaN);
    m.observe('http.duration', 3_600_001);
    expect(points).toHaveLength(0);
    expect(m.stats().dropped).toMatchObject({ unknown_metric: 1, wrong_kind: 1, bad_value: 4 });
  });

  it('counts points with no dataset bound, and survives a dataset that throws', () => {
    const none = make();
    none.count('http.requests');
    expect(none.stats().dropped.no_dataset).toBe(1);
    const broken = make({
      writeDataPoint() {
        throw new Error('quota');
      },
    });
    expect(() => broken.count('http.requests')).not.toThrow();
    expect(broken.stats().dropped.write_failed).toBe(1);
  });
});

describe('validateMeteredMetrics', () => {
  it('requires a people metric to declare synthetic and be a counter', () => {
    expect(() =>
      validateMeteredMetrics({
        'vote.cast': { doc: 'Votes cast at events.', people: true, labels: { client: DIMENSIONS.client } },
      })
    ).toThrow(/must declare the synthetic label/);
    expect(() =>
      validateMeteredMetrics({
        'vote.cast': { doc: 'Votes cast at events.', people: true, kind: 'histogram', labels: { synthetic: DIMENSIONS.synthetic } },
      })
    ).toThrow(/must be a counter/);
  });

  it('refuses a release label and still applies the cardinality rules', () => {
    expect(() =>
      validateMeteredMetrics({ 'a.b': { doc: 'A metric with a bad label.', labels: { release: { kind: 'enum', values: ['x'] } } } })
    ).toThrow(/"release" is written by Signals/);
    expect(() =>
      validateMeteredMetrics({ 'a.b': { doc: 'A metric with a banned label.', labels: { tier: { kind: 'enum', values: ['free'] } } } })
    ).toThrow(/banned/);
  });
});

describe('floorPeople', () => {
  it('withholds under 5 and rounds down to a multiple of 5', () => {
    expect(floorPeople(0)).toEqual({ value: null, suppressed: true });
    expect(floorPeople(4.9)).toEqual({ value: null, suppressed: true });
    expect(floorPeople(5)).toEqual({ value: 5, suppressed: false });
    expect(floorPeople(14)).toEqual({ value: 10, suppressed: false });
    expect(floorPeople(Number.NaN)).toEqual({ value: null, suppressed: true });
  });
});
