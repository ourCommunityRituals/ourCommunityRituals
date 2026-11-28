# Cardinality budgets (level 2)

A metric's **cardinality** is how many distinct combinations of label values
it can take. Each combination is a series to store and query. Signals decides
that number before a metric writes anything, for two reasons:

- **Cost.** A label that takes one value per request (an event id, a time)
  makes series without bound.
- **Privacy.** A label with one value per person is a person.

## Declaring a metric

```ts
import { DIMENSIONS, createCardinalityGuard, type MetricRegistry } from '@ocr/signals';

export const OSE_METRICS = {
  'http.requests': {
    doc: 'Requests served, by route, outcome and client.',
    labels: {
      service: DIMENSIONS.service,                       // 10 values, closed
      client: DIMENSIONS.client,                         // up to 2000 brand slugs
      outcome: { kind: 'enum', values: ['ok', 'client_error', 'server_error'] },
    },
    maxSeries: 100_000,
  },
} as const satisfies MetricRegistry;

const guard = createCardinalityGuard(OSE_METRICS);
const admitted = guard.admit('http.requests', { service: 'ose', client: brandId, outcome: 'ok' });
// admitted.labels is safe to write; admitted.folded says whether anything was folded
```

## Label budgets

| Kind | Declared as | Size (counting `other`) | Use for |
| --- | --- | --- | --- |
| `enum` | `{ kind: 'enum', values: [...] }`, 1 to 64 values | values + 1 | Outcomes, services, anything with a known list |
| `bounded` | `{ kind: 'bounded', max, shape }`, max 1 to 5000 | max + 1 | Clients, regions, event types, routes |

Shapes for `bounded`: `slug` (brand, region or catalog id; no UUIDs, long hex
or long digit runs), `op` (a route pattern from `opFor()`), `code` (a short
machine code).

## The shared dimensions

`DIMENSIONS` holds the budgets agreed in the design doc, so every app cuts the
same way:

| Label | Budget |
| --- | --- |
| `service` | 10, closed list (same as the logger's `SERVICES`) |
| `env` | 4, closed list |
| `client` | 2000 brand slugs |
| `event_type` | 120 catalog ids (47 today) |
| `region` | 50 OER corridors or metros |
| `op` | 300 route patterns |
| `synthetic` | `true`, `false` |

A metric does not carry them all. `client × region × op` alone is over 30
million series; pick the cut the metric is for.

## What is checked, and when

| When | Check | Result |
| --- | --- | --- |
| Definition (tests, deploy) | Every label has a budget; name is not banned | Throws, listing every problem |
| Definition | Worst case (product of label sizes) ≤ `maxSeries` (default 10 000) | Throws with the arithmetic: `client 2001 × region 51` |
| Write (`admit`) | Label not declared | Dropped, counted `undeclared` |
| Write | Enum value not in its list | Becomes `other`, counted `not_in_list` |
| Write | Bounded value of the wrong shape | Becomes `other`, counted `bad_shape` |
| Write | New bounded value past `max` | Becomes `other`, counted `over_budget`; values already seen still pass |

`report()` gives, per metric, the worst case, the series seen, and for each
label its budget, the distinct values seen and how many writes were folded.

## Banned labels

`BANNED_LABELS` can never be declared, whatever the budget: ip, user agent,
anon id, token, email, name, user and session ids, url, path, query, event id,
trace and span ids, request id, H3 cells, coordinates, address, phone, time
stamps and dates, and plan tier (joined at view time, never written).

## Limits

- Seen values live in one Worker isolate's memory. A bounded label's
  fleet-wide worst case is its budget times the isolates running; the store
  (level 3) applies its own ceiling on top.
- The `op` shape cannot tell a fixed word from a slug (`/events/spring-fair`
  is a valid pattern). Build ops with `opFor()`, which masks every segment
  that is not one of the Worker's own words.
