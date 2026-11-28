# @ocr/signals

OCR's own observability product. One package that every OCR Worker (OSE, OW,
OER, OA and the rest) imports, so all of them watch themselves the same way and
under the same privacy rules.

**The rule above all others: never who, always how many.** No signal may hold a
person, an attendee token, an IP, an email, a name, a URL or anything a person
typed. Signals enforces this with an allowlist: a field nobody declared is
dropped before it is written.

Design and the full eight-level plan: [OCR Signals design](https://claude.ai/artifact/WCFVR6eQz1uMzTkkNt2h5L).

## What is in this release

Level 1 of 8: **privacy-safe structured logs.**

| Piece | File | What it does |
| --- | --- | --- |
| Logger | `src/logger.ts` | `createLogger()`: fixed envelope, context, drop counts |
| Schema | `src/schema.ts` | Field kinds; checks every value; floor of 5 on people counts |
| Route patterns | `src/op.ts` | `opFor()`: a path becomes `GET /api/v2/events/:x` |
| Errors | `src/error.ts` | Error class plus a scrubbed, shortened message |
| Credential masking | `src/redact/credentials.ts` | Ported from OSE `lib/log-redact.ts` |
| Personal masking | `src/redact/personal.ts` | OW's key list plus email, IP, id, phone and URL scrubbing |

## Quick start

```ts
import { createLogger, opFor, type EventRegistry } from '@ocr/signals';

const events = {
  'scan.not_counted': {
    doc: 'A scan was refused before it was counted.',
    fields: { reason: { kind: 'enum', values: ['rate_limited', 'vote_code_changed'] } },
  },
  'request.done': {
    doc: 'One request finished: outcome and cost.',
    fields: { status: { kind: 'status' }, wall_ms: { kind: 'ms' }, d1_queries: { kind: 'count' } },
  },
} as const satisfies EventRegistry;

const log = createLogger({ service: 'ose', env: 'staging', release: env.GIT_SHA, events });

// Per request:
const req = log.with({
  op: opFor(request.method, request.url, ROUTE_WORDS),
  client: brandId,          // the organizer's brand slug, never an attendee
  event_type: eventTypeId,  // from the event-type catalog
  region: corridorId,       // OER corridor or metro
});
req.log('request.done', { status: 200, wall_ms: 41, d1_queries: 3 });
req.error('request.done', err, { status: 500 });
```

One line comes out per call:

```json
{"ts":"2026-11-28T17:00:00.000Z","level":"info","event":"request.done","service":"ose","env":"staging","release":"abc1234","op":"GET /api/v2/events/:x","client":"fernbrook-parks","event_type":"etr-rec-bocce","region":"chicago-sw","status":200,"wall_ms":41,"d1_queries":3}
```

## Docs

- [docs/RULES.md](docs/RULES.md): the privacy and cardinality rules, and what enforces each.
- [docs/ADDING-AN-EVENT.md](docs/ADDING-AN-EVENT.md): how to declare an event and pick field kinds.
- [docs/ROADMAP.md](docs/ROADMAP.md): the eight levels and what each will add.

## Checks

```sh
pnpm signals:test        # unit tests plus the never-who invariant
pnpm signals:typecheck
```

Both run in the hub CI gate job.
