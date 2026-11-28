import { describe, expect, it } from 'vitest';
import {
  childOf,
  createTracer,
  formatTraceparent,
  inject,
  newSpanId,
  newTraceId,
  parseTraceparent,
  traceFrom,
  type SpanLine,
  type TraceContext,
} from '../src';

const T = '4bf92f3577b34da6a3ce929d0e0e4736';
const P = '00f067aa0ba902b7';
const headers = (h: Record<string, string>) => new Headers(h);

describe('traceparent', () => {
  it('parses a well formed header and reads the sampled flag', () => {
    expect(parseTraceparent(`00-${T}-${P}-01`)).toEqual({ trace_id: T, parent_span_id: P, sampled: true });
    expect(parseTraceparent(`00-${T}-${P}-00`)?.sampled).toBe(false);
  });

  it('refuses malformed, all-zero and unknown-version headers', () => {
    for (const bad of [
      undefined,
      '',
      'garbage',
      `01-${T}-${P}-01`,
      `00-${'0'.repeat(32)}-${P}-01`,
      `00-${T}-${'0'.repeat(16)}-01`,
      `00-${T.slice(1)}-${P}-01`,
      `00-${T}-${P}-01-extra`,
    ]) {
      expect(parseTraceparent(bad)).toBeNull();
    }
  });

  it('round-trips through format', () => {
    const ctx = { trace_id: T, span_id: P, sampled: true };
    expect(parseTraceparent(formatTraceparent(ctx))).toEqual({ trace_id: T, parent_span_id: P, sampled: true });
  });
});

describe('traceFrom and childOf', () => {
  it('continues an incoming trace with a new span whose parent is the caller', () => {
    const ctx = traceFrom(headers({ traceparent: `00-${T}-${P}-01` }));
    expect(ctx.trace_id).toBe(T);
    expect(ctx.parent_span_id).toBe(P);
    expect(ctx.span_id).toMatch(/^[0-9a-f]{16}$/);
    expect(ctx.span_id).not.toBe(P);
  });

  it('starts a new random trace when the header is missing or bad', () => {
    const a = traceFrom(headers({}));
    const b = traceFrom(headers({ traceparent: 'nope' }));
    expect(a.trace_id).toMatch(/^[0-9a-f]{32}$/);
    expect(a.trace_id).not.toBe(b.trace_id);
    expect(a.parent_span_id).toBeUndefined();
    expect(traceFrom(undefined).sampled).toBe(true);
  });

  it('never makes an all-zero id', () => {
    for (let i = 0; i < 50; i++) {
      expect(newTraceId()).not.toMatch(/^0+$/);
      expect(newSpanId()).not.toMatch(/^0+$/);
    }
  });

  it('makes a child under the current span', () => {
    const ctx = traceFrom(headers({}));
    const child = childOf(ctx);
    expect(child).toMatchObject({ trace_id: ctx.trace_id, parent_span_id: ctx.span_id });
  });
});

describe('inject', () => {
  const ctx: TraceContext = { trace_id: T, span_id: P, sampled: true };
  const ours = ['oursharedevents.com', 'ourwkrp.com'];

  it('adds traceparent for OCR hosts and their subdomains', () => {
    expect(inject('https://stg.oursharedevents.com/api/v2/events', ctx, ours).get('traceparent')).toBe(`00-${T}-${P}-01`);
    expect(inject('https://ourwkrp.com/x', ctx, ours).get('traceparent')).toBe(`00-${T}-${P}-01`);
  });

  it('never sends a trace id to a third party, even one that ends in an OCR name', () => {
    for (const url of ['https://api.example.com/x', 'https://evil-oursharedevents.com/x', 'https://oursharedevents.com.evil.io/']) {
      const h = inject(url, ctx, ours, { traceparent: `00-${T}-${P}-01` });
      expect(h.get('traceparent')).toBeNull();
    }
  });

  it('drops tracestate and keeps the other headers', () => {
    const h = inject('https://ourwkrp.com/x', ctx, ours, { tracestate: 'vendor=someone@example.com', accept: 'application/json' });
    expect(h.get('tracestate')).toBeNull();
    expect(h.get('accept')).toBe('application/json');
  });
});

describe('createTracer', () => {
  function rig() {
    const lines: SpanLine[] = [];
    let t = 1000;
    const tracer = createTracer({
      service: 'ose',
      env: 'staging',
      release: 'abc1234',
      sink: (l) => lines.push(l),
      now: () => t,
      clock: () => new Date('2026-11-28T12:00:00Z'),
    });
    return { lines, tracer, tick: (ms: number) => (t += ms) };
  }

  it('writes one fixed-envelope span line on end', () => {
    const { lines, tracer, tick } = rig();
    const root = traceFrom(headers({ traceparent: `00-${T}-${P}-01` }));
    const span = tracer.start('d1.query', root, 'GET /api/v2/events/:x');
    tick(42);
    span.end('ok', 200);
    span.end('error');
    expect(lines).toEqual([
      {
        ts: '2026-11-28T12:00:00.000Z',
        kind: 'span',
        service: 'ose',
        env: 'staging',
        release: 'abc1234',
        trace_id: T,
        span_id: span.ctx.span_id,
        parent_span_id: root.span_id,
        name: 'd1.query',
        ms: 42,
        outcome: 'ok',
        op: 'GET /api/v2/events/:x',
        status: 200,
      },
    ]);
  });

  it('refuses an id- or email-shaped span name and a raw path as op', () => {
    const { lines, tracer } = rig();
    const root = traceFrom(headers({}));
    tracer.start('someone@example.com', root).end();
    tracer.start('fetch.6f1c2a9e0b7d4c1e9a55', root).end();
    tracer.start('fetch.ow', root, 'GET /api/v2/events?id=42').end();
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toHaveProperty('op');
    expect(tracer.stats().dropped).toEqual({ bad_name: 2, bad_op: 1, sink_failed: 0 });
  });

  it('writes nothing for an unsampled trace', () => {
    const { lines, tracer } = rig();
    tracer.start('d1.query', traceFrom(headers({ traceparent: `00-${T}-${P}-00` }))).end();
    expect(lines).toHaveLength(0);
    expect(tracer.stats().unsampled).toBe(1);
  });

  it('run() marks a throw as error, rethrows it, and never lets a sink break the request', async () => {
    const { lines, tracer } = rig();
    const root = traceFrom(headers({}));
    await expect(
      tracer.run('job.sync', root, () => Promise.reject(new Error('boom')))
    ).rejects.toThrow('boom');
    expect(lines[0]).toMatchObject({ name: 'job.sync', outcome: 'error' });
    const broken = createTracer({
      service: 'ose',
      env: 'staging',
      release: 'x',
      sink: () => {
        throw new Error('sink');
      },
    });
    await expect(broken.run('job.sync', root, (c) => Promise.resolve(c.parent_span_id))).resolves.toBe(root.span_id);
    expect(broken.stats().dropped.sink_failed).toBe(1);
  });
});
