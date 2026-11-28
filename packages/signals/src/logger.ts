/**
 * createLogger(): the one way an OCR Worker writes a log line.
 *
 * Every line is one JSON object with a fixed ENVELOPE and the fields its event
 * declared:
 *
 *   { ts, level, event, service, env, release,      ← always
 *     op, trace_id, span_id,                        ← when the context has them
 *     client, event_type, region, synthetic,        ← the view dimensions
 *     ...fields }                                   ← checked against the schema
 *
 * Dimensions (design doc, "Views by service, client and tier"):
 *   - service: closed list, fixed per Worker.
 *   - client: the organizer's brand id, never an attendee. A short slug or id.
 *   - event_type: from the event-type catalog, when the Worker passes the list.
 *   - region: the corridor or metro (OER), for regional staff views.
 *   - synthetic: true on traffic from Signals' own checks, so it is never
 *     counted as a real person.
 *   - Plan tier is NOT written. It is joined at view time from the brand's
 *     plan history, which keeps OSE's scan path tier-blind (tier-equity).
 *
 * What is dropped instead of written, each counted by reason (stats()):
 *   - a field the event did not declare;
 *   - a value that does not fit its kind (schema.ts);
 *   - an unknown event name (the whole line; counted as `unknown_event`).
 *
 * Telemetry never breaks a request: no method here throws.
 */

import { errorFields } from './error';
import {
  checkField,
  OP_SHAPE,
  validateRegistry,
  type DropReason,
  type EventRegistry,
  type Level,
} from './schema';

export const SERVICES = ['ose', 'ow', 'oer', 'oa', 'osm', 'osg', 'osr', 'osp', 'hub', 'signals'] as const;
export type Service = (typeof SERVICES)[number];

export const ENVS = ['local', 'test', 'staging', 'production'] as const;
export type Env = (typeof ENVS)[number];

const LEVEL_RANK: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/** A brand id or slug: lower case letters, digits, `_` and `-`, 1 to 64. Not an email, not a long number. */
const CLIENT_SHAPE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const TRACE_ID = /^[0-9a-f]{32}$/;
const SPAN_ID = /^[0-9a-f]{16}$/;
const RELEASE_SHAPE = /^[A-Za-z0-9._-]{1,40}$/;

export interface Context {
  op?: string;
  trace_id?: string;
  span_id?: string;
  client?: string;
  event_type?: string;
  /** The corridor or metro the event sits in (OER's list), never a hex cell or an address. */
  region?: string;
  synthetic?: boolean;
}

export type LogLine = Record<string, unknown>;
export type Sink = (line: LogLine) => void;

export interface LoggerOptions<R extends EventRegistry> {
  service: Service;
  env: Env;
  /** The deployed build, e.g. a short git SHA. */
  release: string;
  events: R;
  /** Lowest level written. Default `info`. */
  minLevel?: Level;
  /** Event-type ids from the catalog. When given, any other value is dropped. */
  eventTypes?: readonly string[];
  /** Region ids (OER corridors or metros). When given, any other value is dropped. */
  regions?: readonly string[];
  /** Where lines go. Default: one `console.log(JSON.stringify(line))` per line. */
  sink?: Sink;
  /** Clock, for tests. */
  now?: () => Date;
}

export interface DropStats {
  lines: number;
  written: number;
  unknown_event: number;
  fields: Record<DropReason | 'bad_context', number>;
}

export interface Logger<R extends EventRegistry> {
  /** Write one event. Fields are checked against the event's schema. */
  log(event: keyof R & string, fields?: Record<string, unknown>, opts?: { level?: Level }): void;
  /** Write one event at error level with `error_class` and a scrubbed `error`. */
  error(event: keyof R & string, err: unknown, fields?: Record<string, unknown>): void;
  /** A logger that adds this context to every line (op, trace, client, …). */
  with(ctx: Context): Logger<R>;
  /** Counts of what was written and dropped since creation. */
  stats(): DropStats;
}

export function createLogger<R extends EventRegistry>(opts: LoggerOptions<R>): Logger<R> {
  validateRegistry(opts.events);
  if (!(SERVICES as readonly string[]).includes(opts.service)) {
    throw new Error(`Signals: unknown service "${opts.service}"`);
  }
  if (!(ENVS as readonly string[]).includes(opts.env)) throw new Error(`Signals: unknown env "${opts.env}"`);
  const release = RELEASE_SHAPE.test(opts.release) ? opts.release : 'unknown';
  const minRank = LEVEL_RANK[opts.minLevel ?? 'info'];
  const sink: Sink = opts.sink ?? defaultSink;
  const now = opts.now ?? (() => new Date());
  const eventTypes = opts.eventTypes ? new Set(opts.eventTypes) : null;
  const regions = opts.regions ? new Set(opts.regions) : null;
  const stats: DropStats = {
    lines: 0,
    written: 0,
    unknown_event: 0,
    fields: { undeclared: 0, wrong_kind: 0, out_of_range: 0, not_in_list: 0, unsafe_code: 0, bad_op: 0, bad_context: 0 },
  };

  function contextFields(ctx: Context): LogLine {
    const out: LogLine = {};
    const bad = () => {
      stats.fields.bad_context += 1;
    };
    const take = (key: 'op' | 'trace_id' | 'span_id' | 'client', ok: (v: string) => boolean) => {
      const v = ctx[key];
      if (v === undefined) return;
      if (ok(v)) out[key] = v;
      else bad();
    };
    take('op', (v) => OP_SHAPE.test(v));
    take('trace_id', (v) => TRACE_ID.test(v));
    take('span_id', (v) => SPAN_ID.test(v));
    take('client', isClientId);
    if (ctx.event_type !== undefined) {
      const ok = isClientId(ctx.event_type) && (eventTypes === null || eventTypes.has(ctx.event_type));
      if (ok) out.event_type = ctx.event_type;
      else bad();
    }
    if (ctx.region !== undefined) {
      if (isClientId(ctx.region) && (regions === null || regions.has(ctx.region))) out.region = ctx.region;
      else bad();
    }
    if (ctx.synthetic === true) out.synthetic = true;
    return out;
  }

  function write(ctx: Context, event: string, level: Level, fields: Record<string, unknown>, extra: LogLine): void {
    try {
      stats.lines += 1;
      const spec = opts.events[event];
      if (!spec) {
        stats.unknown_event += 1;
        return;
      }
      if (LEVEL_RANK[level] < minRank) return;
      const line: LogLine = {
        ts: now().toISOString(),
        level,
        event,
        service: opts.service,
        env: opts.env,
        release,
        ...contextFields(ctx),
        ...extra,
      };
      for (const [name, value] of Object.entries(fields)) {
        if (value === undefined) continue;
        const fieldSpec = spec.fields[name];
        if (!fieldSpec) {
          stats.fields.undeclared += 1;
          continue;
        }
        const checked = checkField(name, fieldSpec, value);
        if (!checked.ok) {
          stats.fields[checked.reason] += 1;
          continue;
        }
        line[name] = checked.value;
        if (checked.extra) Object.assign(line, checked.extra);
      }
      sink(line);
      stats.written += 1;
    } catch {
      // A sink that throws must not take the request down with it.
    }
  }

  function make(ctx: Context): Logger<R> {
    return {
      log(event, fields = {}, o = {}) {
        write(ctx, event, o.level ?? opts.events[event]?.level ?? 'info', fields, {});
      },
      error(event, err, fields = {}) {
        write(ctx, event, 'error', fields, { ...errorFields(err) });
      },
      with(more) {
        return make({ ...ctx, ...more });
      },
      stats() {
        return { ...stats, fields: { ...stats.fields } };
      },
    };
  }

  return make({});
}

/**
 * True for a value usable as a client id. OSE brand ids are slugs (`root`,
 * `fernbrook-parks`), so a client id is a short slug and never an id-shaped
 * value: no UUID, no hex run of 12 or more, no run of 7 or more digits. That
 * keeps an attendee's anonymous id or token out of this slot even when a call
 * site passes the wrong variable.
 */
export function isClientId(value: string): boolean {
  return (
    CLIENT_SHAPE.test(value) &&
    !/\d{7,}/.test(value) &&
    !/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value) &&
    !/(?:^|[_-])[0-9a-f]{12,}(?:$|[_-])/i.test(value)
  );
}

function defaultSink(line: LogLine): void {
  console.log(JSON.stringify(line));
}
