import { describe, expect, it } from 'vitest';
import { createAlerter, validateRules, type Alert, type AlertRule, type Route } from '../src';

const oncall: Route = { channel: 'linear', contacts: 'ocr-oncall' };

const rules: AlertRule[] = [
  { kind: 'burn', id: 'ose.browse_burn', doc: 'Browsing events is burning its budget.', service: 'ose', slo: 'ose.browse_events', target: 0.999, routes: [oncall] },
  { kind: 'threshold', id: 'ose.d1_rows', doc: 'D1 rows read per minute is too high.', service: 'ose', metric: 'd1.rows_read', op: '>', value: 1000, severity: 'ticket', routes: [oncall] },
  { kind: 'threshold', id: 'ose.scans_spike', doc: 'Scans per minute spiked at one event type.', service: 'ose', metric: 'scan.counted', op: '>', value: 4, forCount: 1, people: true, severity: 'ticket', routes: [oncall] },
  { kind: 'check', id: 'ose.health_down', doc: 'The OSE health check keeps failing.', service: 'ose', check: 'ose.health', severity: 'page', routes: [oncall, { channel: 'email', contacts: 'ocr-oncall' }] },
];

function rig() {
  const sent: { route: Route; alert: Alert }[] = [];
  let t = Date.parse('2026-11-28T12:00:00Z');
  const alerter = createAlerter({ rules, send: (route, alert) => void sent.push({ route, alert }), now: () => new Date(t) });
  return { sent, alerter, advance: (min: number) => (t += min * 60_000) };
}

describe('validateRules', () => {
  it('refuses an address as contacts, a people rule on small counts, and bad windows', () => {
    let msg = '';
    try {
      validateRules([
        { ...rules[1], id: 'addr', routes: [{ channel: 'email', contacts: 'someone@example.com' }] } as AlertRule,
        { ...rules[2], id: 'small', op: '<' } as AlertRule,
        { ...rules[0], id: 'win', windows: [{ longMinutes: 5, shortMinutes: 60, rate: 2, severity: 'page' }] } as AlertRule,
      ]);
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/contacts must be a contact list id, never an address/);
    expect(msg).toMatch(/a people rule may not fire on a small count/);
    expect(msg).toMatch(/0 < short < long/);
  });
});

describe('burn alerts', () => {
  it('pages only when both the long and short windows burn fast', async () => {
    const { sent, alerter } = rig();
    // 2% errors on a 99.9% target = 20x burn in both windows
    const fast = { 60: { good: 9_800, total: 10_000 }, 5: { good: 980, total: 1_000 }, 360: { good: 9_800, total: 10_000 }, 30: { good: 980, total: 1_000 } };
    expect(await alerter.evaluate('ose.browse_burn', { kind: 'burn', windows: fast })).toBe('firing');
    expect(sent[0]?.alert).toMatchObject({ state: 'firing', severity: 'page', rule: 'ose.browse_burn' });
    expect(sent[0]?.alert.summary).toBe('SLO ose.browse_events is burning its error budget at 20.00x over 60 min (alert above 14.40x).');

    // recovered in the short window: resolves even though the long window is still hot
    const recovered = { ...fast, 5: { good: 1_000, total: 1_000 }, 30: { good: 1_000, total: 1_000 } };
    expect(await alerter.evaluate('ose.browse_burn', { kind: 'burn', windows: recovered })).toBe('ok');
    expect(sent[1]?.alert.state).toBe('resolved');
  });

  it('opens a ticket, not a page, on a slow burn', async () => {
    const { sent, alerter } = rig();
    const slow = { 60: { good: 9_990, total: 10_000 }, 5: { good: 999, total: 1_000 }, 360: { good: 9_920, total: 10_000 }, 30: { good: 992, total: 1_000 } };
    await alerter.evaluate('ose.browse_burn', { kind: 'burn', windows: slow });
    expect(sent[0]?.alert.severity).toBe('ticket');
  });
});

describe('threshold and check alerts', () => {
  it('waits for forCount, then fires once and repeats no sooner than repeatMinutes', async () => {
    const { sent, alerter, advance } = rig();
    for (let i = 0; i < 2; i++) await alerter.evaluate('ose.d1_rows', { kind: 'threshold', value: 5000 });
    expect(sent).toHaveLength(0);
    await alerter.evaluate('ose.d1_rows', { kind: 'threshold', value: 5000 });
    expect(sent).toHaveLength(1);
    advance(30);
    await alerter.evaluate('ose.d1_rows', { kind: 'threshold', value: 5000 });
    expect(sent).toHaveLength(1);
    advance(31);
    await alerter.evaluate('ose.d1_rows', { kind: 'threshold', value: 5000 });
    expect(sent).toHaveLength(2);
    expect(alerter.stats()).toMatchObject({ fired: 1, repeats: 1 });
  });

  it('compares a people metric after the floor, so 1 to 4 never fires and the text shows the floored number', async () => {
    const { sent, alerter } = rig();
    expect(await alerter.evaluate('ose.scans_spike', { kind: 'threshold', value: 4 }, 'fernbrook-parks')).toBe('ok');
    expect(await alerter.evaluate('ose.scans_spike', { kind: 'threshold', value: 7 }, 'fernbrook-parks')).toBe('firing');
    expect(sent[0]?.alert).toMatchObject({ client: 'fernbrook-parks', summary: 'scan.counted is 5, above 4 for 1 checks in a row.' });
  });

  it('pages on repeated check failures, to every route, and keeps going when a route fails', async () => {
    let calls = 0;
    const alerter = createAlerter({
      rules,
      send: (route) => {
        calls += 1;
        if (route.channel === 'linear') throw new Error('linear down');
      },
    });
    await alerter.evaluate('ose.health_down', { kind: 'check', ok: false });
    expect(await alerter.evaluate('ose.health_down', { kind: 'check', ok: false })).toBe('firing');
    expect(calls).toBe(2);
    expect(alerter.stats().send_failed).toBe(1);
  });

  it('refuses an id-shaped client and a mismatched input without throwing', async () => {
    const { sent, alerter } = rig();
    expect(await alerter.evaluate('ose.d1_rows', { kind: 'threshold', value: 1 }, '6f1c2a9e-0b7d-4c1e-9a55-3e2f8d7c6b5a')).toBe('ok');
    expect(await alerter.evaluate('ose.d1_rows', { kind: 'check', ok: false })).toBe('ok');
    expect(await alerter.evaluate('no.such', { kind: 'check', ok: false })).toBe('ok');
    expect(sent).toHaveLength(0);
    expect(alerter.stats().bad_input).toBe(3);
  });
});
