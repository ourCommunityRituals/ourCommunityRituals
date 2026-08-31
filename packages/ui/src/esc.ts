/** Escape untrusted text for safe interpolation into HTML. */
export function esc(input: unknown): string {
  // Coercing an arbitrary value to a safe string is this function's entire
  // contract; the result — "[object Object]" included — is escaped immediately
  // below, so the rule's hazard does not apply.
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escape a value destined for an href/src attribute; blocks javascript: URLs. */
export function escUrl(input: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-base-to-string -- same contract as esc(); result is escaped below.
  const s = String(input ?? '').trim();
  if (/^javascript:/i.test(s) || /^data:/i.test(s)) return '#';
  return esc(s);
}
