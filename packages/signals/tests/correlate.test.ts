import { describe, expect, it } from 'vitest';
import { correlate, rollup, tierAt, type MetricRow, type PlanChange } from '../src';

const T1 = 'a'.repeat(31) + '1';
const T2 = 'b'.repeat(31) + '2';
const ROOT = '1'.repeat(16);
const CHILD = '2'.repeat(16);
const REMOTE = '3'.repeat(16);

const lines = [
  { kind: 'span', ts: '2026-11-28T12:00:00.000Z', service: 'ose', trace_id: T1, span_id: ROOT, name: 'http.request', op: 'GET /api/v2/events/:x', ms: 120, outcome: 'ok', status: 200 },
  { kind: 'span', ts: '2026-11-28T12:00:00.010Z', service: 'ose', trace_id: T1, span_id: CHILD, parent_span_id: ROOT, name: 'd1.events', ms: 30, outcome: 'ok' },
  { kind: 'span', ts: '2026-11-28T12:00:00.050Z', service: 'ow', trace_id: T1, span_id: REMOTE, parent_span_id: ROOT, name: 'fetch.playlist', ms: 60, outcome: 'timeout' },
  { ts: '2026-11-28T12:00:00.020Z', level: 'info', event: 'events.read', service: 'ose', trace_id: T1, span_id: CHILD },
  { ts: '2026-11-28T12:00:00.030Z', level: 'warn', event: 'cache.miss', service: 'ose', trace_id: T1, span_id: '9'.repeat(16) },
  { ts: '2026-11-28T12:00:01.000Z', level: 'error', event: 'job.failed', service: 'oer', trace_id: T2 },
  { ts: '2026-11-28T12:00:02.000Z', level: 'info', event: 'no.trace', service: 'ose' },
  { ts: '2026-11-28T12:00:02.000Z', level: 'info', event: 'bad.trace', service: 'ose', trace_id: 'not-a-trace' },
];

describe('correlate', () => {
  const traces = correlate(lines);

  it('groups by trace and skips lines with no valid trace id', () => {
    expect([...traces.keys()].sort()).toEqual([T1, T2]);
  });

  it('builds the span tree across Workers, with each span holding its own logs', () => {
    const t = traces.get(T1);
    expect(t?.roots).toHaveLength(1);
    const root = t?.roots[0];
    expect(root?.name).toBe('http.request');
    expect(root?.children.map((c) => `${String(c.service)}:${String(c.name)}`)).toEqual(['ose:d1.events', 'ow:fetch.playlist']);
    expect(root?.children[0]?.logs.map((l) => l.event)).toEqual(['events.read']);
    expect(t?.loose_logs.map((l) => l.event)).toEqual(['cache.miss']);
    expect(t).toMatchObject({ services: ['ose', 'ow'], span_count: 3, log_count: 2, outcome: 'timeout', ms: 120 });
  });

  it('marks a trace with only an error log as error', () => {
    expect(traces.get(T2)).toMatchObject({ outcome: 'error', span_count: 0, services: ['oer'] });
  });
});

const plans: PlanChange[] = [
  { client: 'fernbrook-parks', tier: 'free', from: '2026-01-01' },
  { client: 'fernbrook-parks', tier: 'mid', from: '2026-06-01' },
  { client: 'lakeside-league', tier: 'enterprise', from: '2026-03-01' },
];

describe('tierAt', () => {
  it('reads the plan in force at the moment, and never guesses', () => {
    expect(tierAt(plans, 'fernbrook-parks', '2026-05-31')).toBe('free');
    expect(tierAt(plans, 'fernbrook-parks', '2026-06-01')).toBe('mid');
    expect(tierAt(plans, 'lakeside-league', '2026-02-01')).toBe('unknown');
    expect(tierAt(plans, 'nobody', '2026-12-01')).toBe('unknown');
  });
});

describe('rollup', () => {
  const rows: MetricRow[] = [
    { labels: { client: 'fernbrook-parks', event_type: 'etr-rec-bocce', synthetic: 'false' }, value: 7, at: '2026-05-01' },
    { labels: { client: 'fernbrook-parks', event_type: 'etr-rec-bocce', synthetic: 'false' }, value: 6, at: '2026-07-01' },
    { labels: { client: 'fernbrook-parks', event_type: 'etr-market', synthetic: 'true' }, value: 40, at: '2026-07-01' },
    { labels: { client: 'lakeside-league', event_type: 'etr-market', synthetic: 'false' }, value: 3, at: '2026-07-01' },
    { labels: { client: 'lakeside-league', synthetic: 'false' }, value: 9, at: '2026-07-01' },
  ];

  it('totals plain metrics by any dimension, grouping missing labels as none', () => {
    expect(rollup(rows, ['event_type'])).toEqual([
      { key: { event_type: 'etr-market' }, value: 43, suppressed: false },
      { key: { event_type: 'etr-rec-bocce' }, value: 13, suppressed: false },
      { key: { event_type: 'none' }, value: 9, suppressed: false },
    ]);
  });

  it('for people: drops synthetic rows, then floors each group after summing', () => {
    expect(rollup(rows, ['client'], { people: true })).toEqual([
      { key: { client: 'fernbrook-parks' }, value: 10, suppressed: false },
      { key: { client: 'lakeside-league' }, value: 10, suppressed: false },
    ]);
    const market = rollup(rows, ['event_type'], { people: true }).find((r) => r.key.event_type === 'etr-market');
    expect(market).toEqual({ key: { event_type: 'etr-market' }, value: null, suppressed: true });
  });

  it('joins plan tier at view time, by the plan in force when the row was counted', () => {
    expect(rollup(rows, ['tier'], { plans })).toEqual([
      { key: { tier: 'Anchor' }, value: 46, suppressed: false },
      { key: { tier: 'Enterprise' }, value: 12, suppressed: false },
      { key: { tier: 'Local' }, value: 7, suppressed: false },
    ]);
    expect(rollup(rows, ['tier']).map((r) => r.key.tier)).toEqual(['unknown']);
  });
});
