import { describe, expect, it } from 'vitest';
import { createLogger, type EventRegistry, type LogLine } from '../src';

const events = {
  'scan.not_counted': {
    doc: 'A scan was refused before it was counted.',
    fields: { reason: { kind: 'enum', values: ['rate_limited', 'vote_code_changed', 'poster_hour_cap'] } },
  },
  'request.done': {
    doc: 'One request finished; its cost and outcome.',
    fields: {
      status: { kind: 'status' },
      wall_ms: { kind: 'ms' },
      d1_queries: { kind: 'count' },
      scanners: { kind: 'people_count' },
      retries: { kind: 'int', min: 0, max: 5 },
      cached: { kind: 'bool' },
      code: { kind: 'code' },
    },
  },
  'debug.detail': { doc: 'Only written at debug level.', level: 'debug', fields: {} },
} as const satisfies EventRegistry;

function rig(extra: Partial<Parameters<typeof createLogger>[0]> = {}) {
  const lines: LogLine[] = [];
  const log = createLogger({
    service: 'ose',
    env: 'test',
    release: 'abc1234',
    events,
    sink: (l) => lines.push(l),
    now: () => new Date('2026-11-28T17:00:00.000Z'),
    ...extra,
  });
  return { log, lines };
}

describe('envelope', () => {
  it('writes the fixed envelope and the declared fields', () => {
    const { log, lines } = rig();
    log.log('scan.not_counted', { reason: 'rate_limited' });
    expect(lines).toEqual([
      {
        ts: '2026-11-28T17:00:00.000Z',
        level: 'info',
        event: 'scan.not_counted',
        service: 'ose',
        env: 'test',
        release: 'abc1234',
        reason: 'rate_limited',
      },
    ]);
  });

  it('adds context from with(), and validates it', () => {
    const { log, lines } = rig({ eventTypes: ['etr-rec-bocce', 'street_fair'] });
    log
      .with({ op: 'GET /api/v2/events/:x', trace_id: 'a'.repeat(32), span_id: 'b'.repeat(16) })
      .with({ client: 'st-marks-parish', event_type: 'street_fair', region: 'chicago-sw', synthetic: true })
      .log('scan.not_counted', { reason: 'poster_hour_cap' });
    expect(lines[0]).toMatchObject({
      op: 'GET /api/v2/events/:x',
      trace_id: 'a'.repeat(32),
      span_id: 'b'.repeat(16),
      client: 'st-marks-parish',
      event_type: 'street_fair',
      region: 'chicago-sw',
      synthetic: true,
    });
  });

  it('drops bad context values and counts them', () => {
    const { log, lines } = rig({ eventTypes: ['street_fair'] });
    log
      .with({
        op: 'GET /api/v2/events/spring fair',
        trace_id: 'not-a-trace',
        client: 'dana@example.com',
        event_type: 'secret_rave',
      })
      .log('scan.not_counted', { reason: 'rate_limited' });
    expect(lines[0]).not.toHaveProperty('op');
    expect(lines[0]).not.toHaveProperty('trace_id');
    expect(lines[0]).not.toHaveProperty('client');
    expect(lines[0]).not.toHaveProperty('event_type');
    expect(log.stats().fields.bad_context).toBe(4);
  });

  it('never writes a plan tier', () => {
    const { log, lines } = rig();
    log.with({ client: 'acme' }).log('request.done', { tier: 'enterprise' } as Record<string, unknown>);
    expect(lines[0]).not.toHaveProperty('tier');
  });
});

describe('schema enforcement', () => {
  it('drops undeclared fields and counts them', () => {
    const { log, lines } = rig();
    log.log('scan.not_counted', { reason: 'rate_limited', ip: '203.0.113.9', email: 'a@b.co' });
    expect(lines[0]).not.toHaveProperty('ip');
    expect(lines[0]).not.toHaveProperty('email');
    expect(log.stats().fields.undeclared).toBe(2);
  });

  it('drops values of the wrong kind or out of range', () => {
    const { log, lines } = rig();
    log.log('request.done', { status: 700, wall_ms: -1, retries: 9, cached: 'yes', d1_queries: 1.5 });
    expect(lines[0]).not.toHaveProperty('status');
    expect(lines[0]).not.toHaveProperty('wall_ms');
    expect(lines[0]).not.toHaveProperty('retries');
    expect(lines[0]).not.toHaveProperty('cached');
    expect(lines[0]).not.toHaveProperty('d1_queries');
    const f = log.stats().fields;
    expect(f.out_of_range).toBe(3);
    expect(f.wrong_kind).toBe(2);
  });

  it('drops an enum value not in its list', () => {
    const { log, lines } = rig();
    log.log('scan.not_counted', { reason: 'Dana scanned twice' });
    expect(lines[0]).not.toHaveProperty('reason');
    expect(log.stats().fields.not_in_list).toBe(1);
  });

  it('refuses a code that looks like an id, a number, an address or a token', () => {
    const { log, lines } = rig();
    for (const code of ['user_8a7f3c9e1b2d4f60', 'eyJhbGciOi', 'x@y.z', 'call_5551234567', '10.0.0.1']) {
      log.log('request.done', { code });
    }
    log.log('request.done', { code: 'D1_ERROR' });
    expect(lines.map((l) => l.code)).toEqual([undefined, undefined, undefined, undefined, undefined, 'D1_ERROR']);
    expect(log.stats().fields.unsafe_code).toBe(5);
  });

  it('rounds ms to a whole number', () => {
    const { log, lines } = rig();
    log.log('request.done', { wall_ms: 12.6 });
    expect(lines[0]?.wall_ms).toBe(13);
  });
});

describe('people counts follow the floor of 5', () => {
  it.each([
    [0, null, true],
    [4, null, true],
    [5, 5, undefined],
    [13, 10, undefined],
    [99, 95, undefined],
  ])('%i scanners is written as %s', (n, written, suppressed) => {
    const { log, lines } = rig();
    log.log('request.done', { scanners: n });
    expect(lines[0]?.scanners).toBe(written);
    expect(lines[0]?.scanners_suppressed).toBe(suppressed);
  });
});

describe('levels and unknown events', () => {
  it('skips lines under minLevel', () => {
    const { log, lines } = rig();
    log.log('debug.detail');
    expect(lines).toHaveLength(0);
    const r2 = rig({ minLevel: 'debug' });
    r2.log.log('debug.detail');
    expect(r2.lines).toHaveLength(1);
  });

  it('drops an unknown event and counts it', () => {
    const { log, lines } = rig();
    (log.log as (e: string) => void)('made.up');
    expect(lines).toHaveLength(0);
    expect(log.stats().unknown_event).toBe(1);
  });

  it('never throws when the sink throws', () => {
    const log = createLogger({
      service: 'ow',
      env: 'test',
      release: 'r1',
      events,
      sink: () => {
        throw new Error('sink down');
      },
    });
    expect(() => log.log('scan.not_counted', { reason: 'rate_limited' })).not.toThrow();
  });
});

describe('error()', () => {
  it('writes the class and a scrubbed message at error level', () => {
    const { log, lines } = rig();
    log.error(
      'request.done',
      new TypeError('fetch failed: https://x.example/sponsor?t=eyJabc.def for dana@example.com from 198.51.100.7'),
      { status: 500 }
    );
    expect(lines[0]).toMatchObject({ level: 'error', error_class: 'TypeError', status: 500 });
    const msg = String(lines[0]?.error);
    expect(msg).toBe('fetch failed: [url] for [email] from [ip]');
  });

  it('keeps only the label of a D1 error', () => {
    const { log, lines } = rig();
    log.error('request.done', new Error("D1_ERROR: UNIQUE constraint failed: SQLITE_CONSTRAINT value 'dana@example.com'"));
    expect(lines[0]?.error).toBe('D1_ERROR SQLITE_CONSTRAINT');
  });
});

describe('creation checks', () => {
  it('refuses an invalid registry', () => {
    expect(() =>
      createLogger({
        service: 'ose',
        env: 'test',
        release: 'r',
        events: { 'Bad Name': { doc: 'x', fields: { client: { kind: 'bool' } } } },
      })
    ).toThrow(/Bad Name[\s\S]*doc line[\s\S]*reserved/);
  });

  it('refuses an unknown service or env', () => {
    expect(() =>
      createLogger({ service: 'nope' as 'ose', env: 'test', release: 'r', events: {} })
    ).toThrow(/service/);
    expect(() =>
      createLogger({ service: 'ose', env: 'prod' as 'production', release: 'r', events: {} })
    ).toThrow(/env/);
  });
});
