/**
 * Traces (level 4): one request followed across OCR Workers.
 *
 * Propagation is W3C Trace Context (`traceparent`): `00-<trace id>-<parent
 * span id>-<flags>`. A Worker continues an incoming trace when the header is
 * well formed, and starts a new one when it is missing or malformed.
 *
 * What a trace may carry, and what it may not:
 *   - Ids are random (crypto.getRandomValues). They name a request, never a
 *     person, and are never derived from anything about the caller.
 *   - `tracestate` is never read or forwarded: it is free text a vendor can
 *     fill with anything.
 *   - `inject()` adds `traceparent` only to requests for OCR's own hosts, so a
 *     trace id never travels to a third party.
 *   - A span line is a fixed envelope: name (a short code), op (a route
 *     pattern), duration, outcome and status. No free text, no fields.
 *
 * Span lines go to the same place as log lines (one JSON object per line,
 * `kind: "span"`), so level 5 can join logs, metrics and spans on trace_id.
 *
 * Telemetry never breaks a request: no method here throws.
 */

import { defaultSink, ENVS, SERVICES, type Env, type Service } from './logger';
import { isSafeCode, OP_SHAPE } from './schema';

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/;
const ZERO_TRACE = '0'.repeat(32);
const ZERO_SPAN = '0'.repeat(16);
const RELEASE_SHAPE = /^[A-Za-z0-9._-]{1,40}$/;
const HOST = /^[a-z0-9.-]+$/;

export interface TraceContext {
  readonly trace_id: string;
  /** This Worker's span for the current unit of work. */
  readonly span_id: string;
  /** The caller's span, when the trace came in from another Worker. */
  readonly parent_span_id?: string;
  readonly sampled: boolean;
}

/** Parse a `traceparent` header. Null when missing or malformed. */
export function parseTraceparent(value: string | null | undefined): { trace_id: string; parent_span_id: string; sampled: boolean } | null {
  if (typeof value !== 'string') return null;
  const m = TRACEPARENT.exec(value.trim().toLowerCase());
  if (!m) return null;
  const [, trace, parent, flags] = m;
  if (!trace || !parent || !flags || trace === ZERO_TRACE || parent === ZERO_SPAN) return null;
  return { trace_id: trace, parent_span_id: parent, sampled: (parseInt(flags, 16) & 1) === 1 };
}

export function formatTraceparent(ctx: Pick<TraceContext, 'trace_id' | 'span_id' | 'sampled'>): string {
  return `00-${ctx.trace_id}-${ctx.span_id}-${ctx.sampled ? '01' : '00'}`;
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  for (;;) {
    crypto.getRandomValues(buf);
    const hex = Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
    if (!/^0+$/.test(hex)) return hex;
  }
}

export const newTraceId = (): string => randomHex(16);
export const newSpanId = (): string => randomHex(8);

/** Continue the caller's trace, or start one. Never throws. */
export function traceFrom(headers: { get(name: string): string | null } | undefined): TraceContext {
  let incoming: ReturnType<typeof parseTraceparent> = null;
  try {
    incoming = parseTraceparent(headers?.get('traceparent'));
  } catch {
    incoming = null;
  }
  if (incoming) {
    return {
      trace_id: incoming.trace_id,
      span_id: newSpanId(),
      parent_span_id: incoming.parent_span_id,
      sampled: incoming.sampled,
    };
  }
  return { trace_id: newTraceId(), span_id: newSpanId(), sampled: true };
}

/** A child context for a unit of work inside this Worker. */
export function childOf(ctx: TraceContext): TraceContext {
  return { trace_id: ctx.trace_id, span_id: newSpanId(), parent_span_id: ctx.span_id, sampled: ctx.sampled };
}

/**
 * Headers for an outgoing request, with `traceparent` added only when the
 * target is one of `ocrHosts` (exact host, or a subdomain of one). Returns a
 * new Headers; the input is not changed. Any incoming `tracestate` is dropped.
 */
export function inject(
  url: string,
  ctx: TraceContext,
  ocrHosts: readonly string[],
  headers?: HeadersInit
): Headers {
  const out = new Headers(headers);
  out.delete('tracestate');
  try {
    const host = new URL(url).hostname.toLowerCase();
    const ours = ocrHosts.some((h) => {
      const base = h.toLowerCase();
      return HOST.test(base) && (host === base || host.endsWith(`.${base}`));
    });
    if (ours) out.set('traceparent', formatTraceparent(ctx));
    else out.delete('traceparent');
  } catch {
    out.delete('traceparent');
  }
  return out;
}

export type SpanOutcome = 'ok' | 'error' | 'timeout' | 'cancelled';
const OUTCOMES: readonly SpanOutcome[] = ['ok', 'error', 'timeout', 'cancelled'];

export type SpanLine = Record<string, unknown>;

export interface TracerOptions {
  service: Service;
  env: Env;
  release: string;
  /** Where span lines go. Default: the logger's sink, one JSON object per line. */
  sink?: (line: SpanLine) => void;
  now?: () => number;
  clock?: () => Date;
}

export interface Span {
  readonly ctx: TraceContext;
  /** End the span and write its line. A second call does nothing. */
  end(outcome?: SpanOutcome, status?: number): void;
}

export interface TracerStats {
  started: number;
  written: number;
  unsampled: number;
  dropped: { bad_name: number; bad_op: number; sink_failed: number };
}

export interface Tracer {
  /** Start a span named by a short code (`d1.query`, `fetch.ow`) under ctx. */
  start(name: string, ctx: TraceContext, op?: string): Span;
  /** Run fn inside a child span; outcome is `error` if it throws (and it rethrows). */
  run<T>(name: string, ctx: TraceContext, fn: (child: TraceContext) => Promise<T>, op?: string): Promise<T>;
  stats(): TracerStats;
}

export function createTracer(opts: TracerOptions): Tracer {
  if (!(SERVICES as readonly string[]).includes(opts.service)) throw new Error(`Signals: unknown service "${opts.service}"`);
  if (!(ENVS as readonly string[]).includes(opts.env)) throw new Error(`Signals: unknown env "${opts.env}"`);
  const release = RELEASE_SHAPE.test(opts.release) ? opts.release : 'unknown';
  const sink = opts.sink ?? defaultSink;
  const now = opts.now ?? (() => Date.now());
  const clock = opts.clock ?? (() => new Date());
  const stats: TracerStats = { started: 0, written: 0, unsampled: 0, dropped: { bad_name: 0, bad_op: 0, sink_failed: 0 } };

  function start(name: string, parent: TraceContext, op?: string): Span {
    stats.started += 1;
    const ctx = childOf(parent);
    const t0 = now();
    let ended = false;
    return {
      ctx,
      end(outcome = 'ok', status) {
        if (ended) return;
        ended = true;
        try {
          if (!ctx.sampled) {
            stats.unsampled += 1;
            return;
          }
          if (!isSafeCode(name)) {
            stats.dropped.bad_name += 1;
            return;
          }
          const line: SpanLine = {
            ts: clock().toISOString(),
            kind: 'span',
            service: opts.service,
            env: opts.env,
            release,
            trace_id: ctx.trace_id,
            span_id: ctx.span_id,
            parent_span_id: ctx.parent_span_id,
            name,
            ms: Math.max(0, Math.min(3_600_000, Math.round(now() - t0))),
            outcome: OUTCOMES.includes(outcome) ? outcome : 'error',
          };
          if (op !== undefined) {
            if (OP_SHAPE.test(op)) line.op = op;
            else stats.dropped.bad_op += 1;
          }
          if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status <= 599) line.status = status;
          sink(line);
          stats.written += 1;
        } catch {
          stats.dropped.sink_failed += 1;
        }
      },
    };
  }

  return {
    start,
    async run(name, ctx, fn, op) {
      const span = start(name, ctx, op);
      try {
        const out = await fn(span.ctx);
        span.end('ok');
        return out;
      } catch (err) {
        span.end('error');
        throw err;
      }
    },
    stats() {
      return { ...stats, dropped: { ...stats.dropped } };
    },
  };
}
