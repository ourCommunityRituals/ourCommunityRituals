/**
 * Personal-data masking: the second of Signals' two redaction layers.
 *
 * OSE's rule is "never who, always how many". This layer catches a person in
 * the places the schema cannot reach: the text of an error, and anything a
 * call site still writes straight to `console` while it waits to move onto
 * `createLogger()`.
 *
 * Two parts:
 *   1. PERSONAL_KEYS: field names whose value is a person or something they
 *      typed. Merged from OW `src/lib/logger.ts` REDACT_KEYS (2026-11-28) and
 *      OSE's banned list (ip, anon id, user agent, email, token).
 *   2. scrubText(): shapes that are a person or point at one wherever they
 *      appear in text: email addresses, IPv4 and IPv6 addresses, phone-like
 *      digit runs, UUIDs and long hex ids, and URLs (a URL can carry a signed
 *      link or an event slug, so only its fixed shape survives: `[url]`).
 *
 * Limits, so nobody leans on this for more than it does: a name written into a
 * sentence ("failed for Dana") is not recognised. That is why Signals events
 * cannot carry free text at all (schema.ts), and why an error message is cut
 * to ERROR_TEXT_MAX characters after scrubbing.
 */

export const MASK = '[redacted]';

/**
 * Field names masked wherever they are logged. Compared after keyForm()
 * (lower case, letters and digits only), so `display_name`, `displayName` and
 * `Display-Name` are one key.
 */
export const PERSONAL_KEYS: readonly string[] = [
  // OW logger.ts REDACT_KEYS
  'access_token', 'refresh_token', 'code_verifier', 'session_key', 'password',
  'display_name', 'email', 'realname', 'name', 'username', 'lastfm_username',
  'binds', 'sql', 'q', 'query', 'search', 'searchterm',
  // OSE never-who list
  'ip', 'ip_address', 'client_ip', 'cf_connecting_ip', 'x_forwarded_for', 'x_real_ip',
  'user_agent', 'anon_id', 'ose_anon', 'anonymous_id', 'token', 'phone', 'address',
  'first_name', 'last_name', 'full_name', 'contact', 'url', 'href', 'referer', 'referrer',
];

function keyForm(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const PERSONAL = new Set(PERSONAL_KEYS.map(keyForm));

/** True for a field name whose value is a person, what they typed, or where they are. */
export function isPersonalKey(name: string): boolean {
  return PERSONAL.has(keyForm(name));
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const URL_RUN = /\b(?:https?|wss?):\/\/[^\s"'<>]+/gi;
const IPV4 = /\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/g;
// A run of hex digits and colons with at least two colons. It is an IPv6
// address when it has `::`, a hex letter, or four or more colons; a clock time
// (12:30, 12:30:45) has none of those and is left alone.
const IPV6_RUN = /(?<![\w:])[0-9a-f]*:[0-9a-f]*:[0-9a-f:]*(?:%\w+)?(?![\w:])/gi;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const LONG_HEX = /\b[0-9a-f]{16,}\b/gi;
// Seven or more digits, with the separators a phone number uses.
const PHONE = /\+?\(?\d[\d ().-]{5,}\d/g;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * A copy of `text` with every person-shaped run replaced. Order matters: URLs
 * first (they hold emails and ids), then emails, then addresses and ids.
 */
export function scrubText(text: string): string {
  return text
    .replace(URL_RUN, '[url]')
    .replace(EMAIL, '[email]')
    .replace(UUID, '[id]')
    .replace(IPV6_RUN, (m) => (m.includes('::') || /[a-f]/i.test(m) || m.split(':').length > 4 ? '[ip]' : m))
    .replace(IPV4, '[ip]')
    .replace(LONG_HEX, '[id]')
    .replace(PHONE, (m) => (!ISO_DATE.test(m) && (m.match(/\d/g)?.length ?? 0) >= 7 ? '[number]' : m));
}

/** The longest error text Signals writes, after scrubbing. */
export const ERROR_TEXT_MAX = 300;
