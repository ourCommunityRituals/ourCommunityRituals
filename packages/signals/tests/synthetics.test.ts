import { describe, expect, it } from 'vitest';
import {
  runCheck,
  STAGING_HOSTS,
  SYNTHETIC_HEADER,
  validateChecks,
  type ApiCheck,
  type Check,
  type MultiCheck,
} from '../src';

type Call = { url: string; init: RequestInit };

function fakeFetch(routes: Record<string, () => Response | Promise<Response>>) {
  const calls: Call[] = [];
  const fetch = (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const path = new URL(url).pathname;
    const handler = routes[path];
    if (!handler) return Promise.reject(new Error('no route'));
    return Promise.resolve(handler());
  };
  return { calls, fetch };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const health: ApiCheck = {
  kind: 'api',
  id: 'ose.health',
  doc: 'The OSE health endpoint answers ok.',
  service: 'ose',
  host: 'stg.oursharedevents.com',
  step: { name: 'health', path: '/health', op: 'GET /health', expect: { status: [200], jsonHas: ['ok'], header: 'content-type' } },
};

const browse: MultiCheck = {
  kind: 'multi',
  id: 'ose.browse_event',
  doc: 'List public events, then open the first one.',
  service: 'ose',
  host: 'stg.oursharedevents.com',
  steps: [
    { name: 'list', path: '/api/v2/events', op: 'GET /api/v2/events', carry: { slug: 'items[0].slug' } },
    { name: 'open', path: '/api/v2/events/{slug}', op: 'GET /api/v2/events/:x', expect: { jsonHas: ['event.title'] } },
  ],
};

describe('validateChecks', () => {
  it('accepts well formed checks on staging hosts', () => {
    expect(() => validateChecks([health, browse])).not.toThrow();
  });

  it('refuses production, secrets in definitions, query strings and uncarried vars', () => {
    const bad: Check[] = [
      { ...health, id: 'prod', host: 'oursharedevents.com' },
      { ...health, id: 'secret', step: { ...health.step, auth: { env: 'Bearer abc123' } } },
      { ...health, id: 'query', step: { ...health.step, path: '/api/v2/events?brand=fernbrook' } },
      { ...browse, id: 'uncarried', steps: [{ name: 'open', path: '/api/v2/events/{slug}' }] },
      { kind: 'browser', id: 'flow', doc: 'Open the map and a place.', service: 'ose', host: STAGING_HOSTS[0] ?? '', spec: '../x.js', ops: ['/map'] },
      { ...health, id: 'ose.health' },
    ];
    let message = '';
    try {
      validateChecks([health, ...bad]);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/"prod": host "oursharedevents.com" is not an allowed check host/);
    expect(message).toMatch(/auth must name an env var, never hold a secret/);
    expect(message).toMatch(/no query string/);
    expect(message).toMatch(/\{slug\} is not carried by an earlier step/);
    expect(message).toMatch(/spec must be a tests\/…spec.ts path/);
    expect(message).toMatch(/op "\/map" is not a route pattern/);
    expect(message).toMatch(/"ose.health": duplicate id/);
  });
});

describe('runCheck', () => {
  it('marks every request as synthetic and traced, and reports ok', async () => {
    const { calls, fetch } = fakeFetch({ '/health': () => json({ ok: true }) });
    const r = await runCheck(health, { fetch });
    expect(r).toMatchObject({ check: 'ose.health', ok: true, synthetic: true, steps: [{ name: 'health', ok: true, status: 200 }] });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers[SYNTHETIC_HEADER]).toBe('1');
    expect(headers.traceparent).toMatch(new RegExp(`^00-${r.trace_id}-[0-9a-f]{16}-01$`));
  });

  it('carries a value between steps and never writes it into the result', async () => {
    const { calls, fetch } = fakeFetch({
      '/api/v2/events': () => json({ items: [{ slug: 'spring-fair-2026' }] }),
      '/api/v2/events/spring-fair-2026': () => json({ event: { title: 'Spring Fair' } }),
    });
    const r = await runCheck(browse, { fetch });
    expect(r.ok).toBe(true);
    expect(calls[1]?.url).toBe('https://stg.oursharedevents.com/api/v2/events/spring-fair-2026');
    expect(JSON.stringify(r)).not.toContain('spring-fair');
    expect(JSON.stringify(r)).not.toContain('Spring Fair');
  });

  it('stops at the first failing step and names why', async () => {
    const { fetch } = fakeFetch({
      '/api/v2/events': () => json({ items: [{ slug: 'x' }] }),
      '/api/v2/events/x': () => json({ event: {} }),
    });
    const r = await runCheck(browse, { fetch });
    expect(r).toMatchObject({ ok: false, failed_step: 'open' });
    expect(r.steps[1]?.failure).toBe('json_missing');

    const wrongStatus = await runCheck(health, { fetch: fakeFetch({ '/health': () => json({ ok: true }, 503) }).fetch });
    expect(wrongStatus.steps[0]?.failure).toBe('status');

    const down = await runCheck(health, { fetch: fakeFetch({}).fetch });
    expect(down.steps[0]?.failure).toBe('network');
  });

  it('flags a slow response', async () => {
    let t = 0;
    const slow: ApiCheck = { ...health, step: { ...health.step, expect: { maxMs: 100 } } };
    const { fetch } = fakeFetch({
      '/health': () => {
        t += 250;
        return json({ ok: true });
      },
    });
    const r = await runCheck(slow, { fetch, now: () => t });
    expect(r.steps[0]).toMatchObject({ failure: 'slow', ms: 250 });
  });

  it('reads a credential from env at run time and never puts it in the result', async () => {
    const authed: ApiCheck = { ...health, step: { ...health.step, auth: { env: 'SIGNALS_CHECK_TOKEN' } } };
    const { calls, fetch } = fakeFetch({ '/health': () => json({ ok: true }) });
    const r = await runCheck(authed, { fetch, env: { SIGNALS_CHECK_TOKEN: 'tok_live_secret_value' } });
    expect((calls[0]?.init.headers as Record<string, string>).authorization).toBe('Bearer tok_live_secret_value');
    expect(JSON.stringify(r)).not.toContain('tok_live');

    const missing = await runCheck(authed, { fetch });
    expect(missing.steps[0]?.failure).toBe('missing_secret');
  });
});
