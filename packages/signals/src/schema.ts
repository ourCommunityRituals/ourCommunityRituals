/**
 * Event schemas: the allowlist every Signals log line is built from.
 *
 * A Worker declares, once, each event it may write and the fields that event
 * may carry. A field has a KIND, and every kind is a closed shape: a value
 * from a fixed list, a bounded number, a route pattern, a short code. There
 * is no free-text kind, on purpose. A person's name, an email, an IP, a token
 * or a URL has nowhere to go, because no kind accepts one.
 *
 * A value that does not fit its kind is dropped and counted (see logger.ts),
 * never written. A field the event did not declare is dropped and counted.
 */

/** A value from a fixed list. The cheapest and safest kind; prefer it. */
export interface EnumField {
  readonly kind: 'enum';
  readonly values: readonly string[];
}

/** A whole number inside [min, max]. */
export interface IntField {
  readonly kind: 'int';
  readonly min: number;
  readonly max: number;
}

/** A duration in milliseconds, 0 up to one hour, rounded to a whole ms. */
export interface MsField {
  readonly kind: 'ms';
}

export interface BoolField {
  readonly kind: 'bool';
}

/** An HTTP status code, 100 to 599. */
export interface StatusField {
  readonly kind: 'status';
}

/**
 * A count of THINGS (rows read, queries run, retries). Written exactly.
 * Never use it for a count of people or of what people did: use people_count.
 */
export interface CountField {
  readonly kind: 'count';
}

/**
 * A count of PEOPLE or of their actions (scans, votes, sign-ups). Follows OSE's
 * uniform floor (lib/count-floor.ts, OSE-665 and OSE-2151): under 5 is written
 * as null with `<name>_suppressed: true`; from 5 up it is rounded DOWN to a
 * multiple of 5, so two reads a moment apart never show one person's action.
 */
export interface PeopleCountField {
  readonly kind: 'people_count';
}

/** A route pattern such as `GET /api/v2/events/:x` (see op.ts). */
export interface OpField {
  readonly kind: 'op';
}

/**
 * A short machine code (`D1_ERROR`, `rate_limited`, `vote.closed`): letters,
 * digits and `_ . : -`, up to 64 characters, and nothing that looks like an
 * id, a number, an address or a token. Use enum when the list is known.
 */
export interface CodeField {
  readonly kind: 'code';
}

export type FieldSpec =
  | EnumField
  | IntField
  | MsField
  | BoolField
  | StatusField
  | CountField
  | PeopleCountField
  | OpField
  | CodeField;

export type Level = 'debug' | 'info' | 'warn' | 'error';

export interface EventSpec {
  /** One line on what the event means and when it is written. Required: it is the event's documentation. */
  readonly doc: string;
  /** The level the event is written at unless the call says otherwise. */
  readonly level?: Level;
  readonly fields: Readonly<Record<string, FieldSpec>>;
}

export type EventRegistry = Readonly<Record<string, EventSpec>>;

/** Event names: lower case dotted words, `scan.not_counted`. */
export const EVENT_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){0,3}$/;
/** Field names: lower snake case. */
export const FIELD_NAME = /^[a-z][a-z0-9_]{0,39}$/;

/** Field names Signals sets itself; an event may not declare them. */
export const RESERVED_FIELDS: readonly string[] = [
  'ts', 'level', 'event', 'service', 'env', 'release', 'op',
  'trace_id', 'span_id', 'client', 'event_type', 'region', 'synthetic',
  'error_class', 'error',
];

/**
 * Check a registry once, at logger creation, so a bad schema fails in tests
 * and at deploy, never as a silent drop in production.
 */
export function validateRegistry(events: EventRegistry): void {
  const problems: string[] = [];
  for (const [name, spec] of Object.entries(events)) {
    if (!EVENT_NAME.test(name)) problems.push(`event "${name}": name must match ${EVENT_NAME.source}`);
    if (typeof spec.doc !== 'string' || spec.doc.trim().length < 8) {
      problems.push(`event "${name}": needs a doc line`);
    }
    for (const [field, f] of Object.entries(spec.fields)) {
      if (!FIELD_NAME.test(field)) problems.push(`event "${name}": field "${field}" must be lower snake case`);
      if (RESERVED_FIELDS.includes(field)) problems.push(`event "${name}": field "${field}" is reserved`);
      if (f.kind === 'enum' && (f.values.length === 0 || f.values.length > 64)) {
        problems.push(`event "${name}": enum "${field}" needs 1 to 64 values`);
      }
      if (f.kind === 'enum' && f.values.some((v) => !CODE_SHAPE.test(v))) {
        problems.push(`event "${name}": enum "${field}" has a value that is not a short code`);
      }
      if (f.kind === 'int' && !(Number.isInteger(f.min) && Number.isInteger(f.max) && f.min <= f.max)) {
        problems.push(`event "${name}": int "${field}" needs whole min <= max`);
      }
    }
  }
  if (problems.length > 0) throw new Error(`Signals registry is invalid:\n- ${problems.join('\n- ')}`);
}

const CODE_SHAPE = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/;
/** Shapes a code must not have: they are ids, numbers, addresses or tokens. */
const NOT_A_CODE = [
  /\d{5,}/, // a number long enough to be an id or a phone
  /[0-9a-f]{12,}/i, // a hex id
  /^eyJ/, // a JWT or signed link
  /@/, // an email
  /(?:\d{1,3}\.){3}\d{1,3}/, // an IPv4 address
];

/** Why a value was dropped. Counted per reason; see logger.ts. */
export type DropReason = 'undeclared' | 'wrong_kind' | 'out_of_range' | 'not_in_list' | 'unsafe_code' | 'bad_op';

export type Checked = { ok: true; value: unknown; extra?: Record<string, unknown> } | { ok: false; reason: DropReason };

/** Op patterns: a method, then `/`-separated fixed words or `:x`. */
export const OP_SHAPE = /^(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|CRON|QUEUE) (?:\/(?:[a-z0-9][a-z0-9_.-]{0,39}|:x))*\/?$/;

/** Check one value against its kind. Pure. */
export function checkField(name: string, spec: FieldSpec, value: unknown): Checked {
  switch (spec.kind) {
    case 'enum':
      if (typeof value !== 'string') return { ok: false, reason: 'wrong_kind' };
      return spec.values.includes(value) ? { ok: true, value } : { ok: false, reason: 'not_in_list' };
    case 'int':
      if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false, reason: 'wrong_kind' };
      return value >= spec.min && value <= spec.max ? { ok: true, value } : { ok: false, reason: 'out_of_range' };
    case 'ms':
      if (typeof value !== 'number' || !Number.isFinite(value)) return { ok: false, reason: 'wrong_kind' };
      return value >= 0 && value <= 3_600_000 ? { ok: true, value: Math.round(value) } : { ok: false, reason: 'out_of_range' };
    case 'bool':
      return typeof value === 'boolean' ? { ok: true, value } : { ok: false, reason: 'wrong_kind' };
    case 'status':
      if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false, reason: 'wrong_kind' };
      return value >= 100 && value <= 599 ? { ok: true, value } : { ok: false, reason: 'out_of_range' };
    case 'count':
      if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false, reason: 'wrong_kind' };
      return value >= 0 && value <= Number.MAX_SAFE_INTEGER ? { ok: true, value } : { ok: false, reason: 'out_of_range' };
    case 'people_count':
      if (typeof value !== 'number' || !Number.isInteger(value)) return { ok: false, reason: 'wrong_kind' };
      if (value < 0) return { ok: false, reason: 'out_of_range' };
      if (value < PEOPLE_FLOOR) return { ok: true, value: null, extra: { [`${name}_suppressed`]: true } };
      return { ok: true, value: value - (value % PEOPLE_FLOOR) };
    case 'op':
      return typeof value === 'string' && OP_SHAPE.test(value) ? { ok: true, value } : { ok: false, reason: 'bad_op' };
    case 'code':
      if (typeof value !== 'string') return { ok: false, reason: 'wrong_kind' };
      return isSafeCode(value) ? { ok: true, value } : { ok: false, reason: 'unsafe_code' };
  }
}

/** OSE's uniform floor, K = 5 (lib/count-floor.ts). */
export const PEOPLE_FLOOR = 5;

/** True for a string that is a short code and nothing that could point at a person. */
export function isSafeCode(value: string): boolean {
  return CODE_SHAPE.test(value) && !NOT_A_CODE.some((re) => re.test(value));
}
