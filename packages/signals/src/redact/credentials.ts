/**
 * Credential masking: the first of Signals' two redaction layers.
 *
 * Ported unchanged in behaviour from OSE `workers/oursharedevents/src/lib/log-redact.ts`
 * (main 2026-11-28), so OSE can switch its import to this package without a
 * change in what reaches Workers Logs. OSE's own tests for that file are the
 * reference; tests/credentials.test.ts here repeats the cases that matter.
 *
 * What it masks: the value under a credential header name (in a Headers, a
 * Request, or any object), the same pair written into text, any `Bearer …`,
 * and any `eyJ…` run (a JWT or an OSE signed link).
 *
 * What it does not do: recognise a person. That is personal.ts's job, and the
 * schema in schema.ts is the real gate: a Signals event cannot carry free text.
 */

import { isPersonalKey, scrubText } from './personal';

export const REDACTED = '[redacted]';

/** Request headers whose value is a credential, lower-cased. */
export const CREDENTIAL_HEADERS: readonly string[] = [
  'authorization',
  'proxy-authorization',
  'cf-access-jwt-assertion',
  'cf-access-client-secret',
  'cf-authorization',
  'x-ocr-internal',
];

const CREDENTIAL_KEYS = new Set(CREDENTIAL_HEADERS.map(keyForm));

/** `Cf-Access-Jwt-Assertion`, `cf_access_jwt_assertion` and `CfAccessJwtAssertion` are one key. */
export function keyForm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Any name that ends in "cookie": the request header, set-cookie, and fields named after either. */
const COOKIE_NAMED = /cookie$/;

/** True for a credential name or a personal field name (personal.ts). */
export function isMaskedKey(name: string): boolean {
  return isCredentialKey(name) || isPersonalKey(name);
}

/** True for a name whose value is a credential. */
export function isCredentialKey(name: string): boolean {
  const key = keyForm(name);
  return CREDENTIAL_KEYS.has(key) || COOKIE_NAMED.test(key);
}

// One alternation per header, with `-` and `_` both accepted between its
// words, and one more for any name that ends in "cookie".
const HEADER_ALTERNATION = [
  ...CREDENTIAL_HEADERS.map((h) => h.split('-').join('[-_]?')),
  '[a-z0-9_-]*cookie',
].join('|');

/**
 * `"authorization": "…"`, `authorization=…`, `Cookie: a=b; c=d`. An unquoted
 * value runs to the end of its line, or to the quote that closes the string it
 * is written inside, so a JSON line stays JSON after masking. A piece of the
 * value that was masked already (`a=[redacted]; b=…`) does not end it.
 */
const HEADER_PAIR = new RegExp(
  `((?:^|[^a-z0-9_-])["']?(?:${HEADER_ALTERNATION})["']?\\s*[:=]\\s*)` +
    `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|(?:\\[redacted\\]|[^\\r\\n,}\\]"'\\\\])+)`,
  'gi'
);
const BEARER = /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi;
/** A JWT or a signed link: `eyJ` is base64url for `{"`. */
const TOKEN_RUN = /eyJ[A-Za-z0-9_-]{6,}(?:\.[A-Za-z0-9_-]+){0,2}/g;
/** Cheap test first: nearly every line has none of these and is returned as it came. */
const SUSPECT = new RegExp(`eyJ|bearer\\s|${HEADER_ALTERNATION}`, 'i');

export function redactText(text: string): string {
  if (!SUSPECT.test(text)) return text;
  return text
    .replace(HEADER_PAIR, (_m, lead: string, value: string) => {
      // Keep the value's own quotes. A bare value under a quoted key (`"cookie":null`)
      // is JSON, and stays JSON only if the mask is a string.
      const own = value[0] === '"' || value[0] === "'" ? value[0] : '';
      const quote = own || (/["']\s*:\s*$/.test(lead) ? '"' : '');
      return `${lead}${quote}${REDACTED}${quote}`;
    })
    .replace(BEARER, `$1${REDACTED}`)
    .replace(TOKEN_RUN, REDACTED);
}

const MAX_DEPTH = 6;

function redactHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, name) => {
    out[name] = isCredentialKey(name) ? REDACTED : redactText(value);
  });
  return out;
}

function pathOf(rawUrl: string): string {
  try {
    return new URL(rawUrl).pathname;
  } catch {
    return '[unreadable]';
  }
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return scrubText(redactText(value));
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  if (depth >= MAX_DEPTH) return '[nested]';
  seen.add(value);

  if (typeof Headers !== 'undefined' && value instanceof Headers) return redactHeaders(value);
  if (typeof Request !== 'undefined' && value instanceof Request) {
    return {
      method: value.method,
      path: pathOf(value.url),
      headers: redactHeaders(value.headers),
    };
  }
  if (typeof Response !== 'undefined' && value instanceof Response) {
    return { status: value.status, headers: redactHeaders(value.headers) };
  }
  if (typeof URL !== 'undefined' && value instanceof URL) return value.pathname;
  if (value instanceof Error) {
    const text = `${value.name}: ${value.message}`;
    const masked = redactText(text);
    const stack = typeof value.stack === 'string' ? redactText(value.stack) : undefined;
    // An error that says nothing secret is logged as the error it is.
    if (masked === text && stack === value.stack) return value;
    return stack === undefined ? masked : `${masked}\n${stack}`;
  }
  if (Array.isArray(value)) return value.map((v) => redactValue(v, depth + 1, seen));
  if (value instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of value) {
      const name = String(k);
      out[name] = isMaskedKey(name) ? REDACTED : redactValue(v, depth + 1, seen);
    }
    return out;
  }
  const out: Record<string, unknown> = {};
  for (const [name, v] of Object.entries(value as Record<string, unknown>)) {
    out[name] = isMaskedKey(name) ? REDACTED : redactValue(v, depth + 1, seen);
  }
  return out;
}

/** A copy of `value` with every credential it holds masked. Never throws, never mutates. */
export function redact(value: unknown): unknown {
  try {
    return redactValue(value, 0, new WeakSet());
  } catch {
    return '[unreadable]';
  }
}

const LEVELS = ['log', 'info', 'warn', 'error', 'debug', 'trace'] as const;
type Level = (typeof LEVELS)[number];
type LogFn = (...args: unknown[]) => void;
type ConsoleLike = Partial<Record<Level, LogFn>>;

/** The consoles already wrapped, so a second install changes nothing. */
const INSTALLED = new WeakSet();

/**
 * Wrap the six console levels of `target` so every argument is redacted before
 * it is written. Once per console: calling it again does nothing. A level the
 * target lacks is skipped.
 */
export function installConsoleRedaction(target: ConsoleLike = console): void {
  if (INSTALLED.has(target)) return;
  INSTALLED.add(target);
  for (const level of LEVELS) {
    const original = target[level];
    if (typeof original !== 'function') continue;
    target[level] = (...args: unknown[]) => {
      original.apply(target, args.map(redact));
    };
  }
}

/** True when `target` has been wrapped by installConsoleRedaction. */
export function isConsoleRedactionInstalled(
  target: ConsoleLike = console
): boolean {
  return INSTALLED.has(target);
}
