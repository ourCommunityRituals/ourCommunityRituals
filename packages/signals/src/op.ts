/**
 * Route patterns: how a request is named in every signal.
 *
 * A raw path can identify someone (an event slug can name a church) or carry
 * a credential (`/api/v2/sponsors/draft/<token>/asset`). So a path is never
 * written. It is turned into a pattern: each segment that is one of the
 * Worker's own fixed words stays, every other segment becomes `:x`. Missing a
 * word only costs readability (it falls back to `:x`); it can never leak,
 * because the default is to mask. Same rule as OSE `lib/cost-metric.ts`.
 */

const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const WORD = /^[a-z0-9][a-z0-9_.-]{0,39}$/;

/**
 * `opFor('GET', '/api/v2/events/spring-fair-2026', words)` gives
 * `GET /api/v2/events/:x`. `words` is the Worker's list of fixed segments.
 * Takes a path, a full URL or a Request-like `{ method, url }`.
 */
export function opFor(method: string, pathOrUrl: string, words: ReadonlySet<string>): string {
  const m = method.toUpperCase();
  const verb = METHODS.has(m) ? m : 'OTHER';
  let path = pathOrUrl;
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathOrUrl)) path = new URL(pathOrUrl).pathname;
  } catch {
    path = '/';
  }
  path = path.split(/[?#]/, 1)[0] ?? '/';
  const segments = path.split('/').filter((s) => s.length > 0);
  const masked = segments.map((s) => {
    let word = s;
    try {
      word = decodeURIComponent(s);
    } catch {
      return ':x';
    }
    word = word.toLowerCase();
    return words.has(word) && WORD.test(word) ? word : ':x';
  });
  return `${verb === 'OTHER' ? 'GET' : verb} /${masked.join('/')}`;
}

/** The op for a scheduled run: `CRON /<name>`, name from the Worker's own list. */
export function cronOp(name: string): string {
  return WORD.test(name) ? `CRON /${name}` : 'CRON /:x';
}
