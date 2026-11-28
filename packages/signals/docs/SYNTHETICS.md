# Synthetic checks (level 6)

Signals visits OCR's own surfaces on a schedule and says whether each journey
works, before a person finds out. Checks are code: reviewed, tested, versioned.

## Three kinds

```ts
import { runCheck, validateChecks, type Check } from '@ocr/signals';

export const CHECKS: Check[] = [
  {
    kind: 'api',
    id: 'ose.health',
    doc: 'The OSE health endpoint answers ok.',
    service: 'ose',
    host: 'stg.oursharedevents.com',
    step: { name: 'health', path: '/health', op: 'GET /health', expect: { jsonHas: ['ok'], maxMs: 2000 } },
  },
  {
    kind: 'multi',
    id: 'ose.browse_event',
    doc: 'List public events, then open the first one.',
    service: 'ose',
    host: 'stg.oursharedevents.com',
    steps: [
      { name: 'list', path: '/api/v2/events', op: 'GET /api/v2/events', carry: { slug: 'items[0].slug' } },
      { name: 'open', path: '/api/v2/events/{slug}', op: 'GET /api/v2/events/:x', expect: { jsonHas: ['event.title'] } },
    ],
  },
  {
    kind: 'browser',
    id: 'ose.map_place',
    doc: 'Open the landing map, zoom, and open a place panel.',
    service: 'ose',
    host: 'stg.oursharedevents.com',
    spec: 'tests/e2e/2-pages/map-place-panel-layout.spec.ts',
    ops: ['GET /', 'GET /api/v2/events/map'],
  },
];

validateChecks(CHECKS); // in a test, so a bad check fails CI
const result = await runCheck(CHECKS[0], { fetch, env });
```

- **api**: one request and its assertions (`status`, `maxMs`, `jsonHas`, `header`).
- **multi**: steps in order. `carry` takes a value from a response (by JSON
  path) into a later step's `{var}`. The value stays in memory for the run.
- **browser**: a front-end flow, declared here so it is listed and joined with
  server signals by `ops`, and run by Playwright in CI. `runCheck` does not
  drive a browser.

## Safe to run against real systems

- **Marked.** Every request carries `x-ocr-synthetic: 1` and a fresh
  `traceparent`; every result says `synthetic: true`. Workers should put
  `synthetic: true` in their Signals context when they see the header, so
  people metrics (which must declare `synthetic`) and rollups leave it out.
- **Own hosts only.** `host` must be in the allowed list, by default
  `STAGING_HOSTS`. Production is closed until the owner opens it.
- **No secrets in definitions.** `auth: { env: 'SIGNALS_CHECK_TOKEN' }` names
  an env var; the runner reads it at run time. A missing secret fails the
  step as `missing_secret`. The value never appears in a result.
- **Results carry no response data.** Per step: name, op, status, ms, ok, and
  on failure a code (`status`, `slow`, `json_missing`, `header_missing`,
  `not_json`, `network`, `missing_secret`, `carry_missing`). Paths with carried
  values are not written.
- **Plain paths.** No query strings and no `..`; anything a step needs is in
  the path pattern or a fixed JSON body of test data.

Where checks run on a schedule (a cron Worker or a CI job) and how failures
alert are levels 7 and 8.
