import { describe, expect, it } from 'vitest';
import { installConsoleRedaction, isMaskedKey, redact, redactText, scrubText } from '../src';

describe('credential layer (ported from OSE lib/log-redact.ts)', () => {
  it('masks header pairs, bearer values and eyJ runs in text', () => {
    expect(redactText('"authorization":"Bearer abcdefghijk"')).toBe('"authorization":"[redacted]"');
    expect(redactText('Cookie: ose_anon=abc; x=y')).toBe('Cookie: [redacted]');
    expect(redactText('token eyJhbGciOiJIUzI1NiJ9.e30.sig here')).toBe('token [redacted] here');
    expect(redactText('nothing to see')).toBe('nothing to see');
  });

  it('masks credential and personal keys in objects', () => {
    expect(
      redact({ headers: { Authorization: 'x' }, display_name: 'Dana', email: 'd@e.co', op: 'GET /' })
    ).toEqual({ headers: { Authorization: '[redacted]' }, display_name: '[redacted]', email: '[redacted]', op: 'GET /' });
  });

  it('writes a Request as method, path and masked headers only', () => {
    const req = new Request('https://x.example/sponsor?t=eyJsecret', { headers: { authorization: 'Bearer abcdefghij' } });
    expect(redact(req)).toEqual({ method: 'GET', path: '/sponsor', headers: { authorization: '[redacted]' } });
  });

  it('knows the merged key list', () => {
    for (const k of ['Cf-Access-Jwt-Assertion', 'set-cookie', 'ose_anon', 'displayName', 'client_ip', 'X-Forwarded-For']) {
      expect(isMaskedKey(k)).toBe(true);
    }
    for (const k of ['op', 'status', 'event_type', 'client']) expect(isMaskedKey(k)).toBe(false);
  });
});

describe('personal layer', () => {
  it.each([
    ['mail dana.r@example.org now', 'mail [email] now'],
    ['from 203.0.113.42', 'from [ip]'],
    ['from 2001:db8::8a2e:370:7334', 'from [ip]'],
    ['id 3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90', 'id [id]'],
    ['hash 8f14e45fceea167a5a36dedd4bea2543', 'hash [id]'],
    ['call (312) 555-0199', 'call [number]'],
    ['see https://ourwkrp.com/dj/dana?x=1', 'see [url]'],
    ['at 12:30 on 2026-11-28, 3 retries', 'at 12:30 on 2026-11-28, 3 retries'],
  ])('%s', (input, want) => {
    expect(scrubText(input)).toBe(want);
  });
});

describe('installConsoleRedaction', () => {
  it('wraps a console once and masks credentials and persons', () => {
    const seen: unknown[][] = [];
    const fake = { log: (...a: unknown[]) => seen.push(a), error: (...a: unknown[]) => seen.push(a) };
    installConsoleRedaction(fake);
    installConsoleRedaction(fake);
    fake.log('user dana@example.com', { cookie: 'ose_anon=1' });
    expect(seen).toEqual([['user [email]', { cookie: '[redacted]' }]]);
  });
});
