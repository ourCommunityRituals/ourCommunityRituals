# SLOs (level 7)

What "working" means for each journey, written as code and reviewed like code.

```ts
import { evaluateSlo, validateSlos, type SloSpec } from '@ocr/signals';

export const SLOS: SloSpec[] = [
  {
    id: 'ose.browse_events',
    doc: 'People can list and open public events.',
    service: 'ose',
    ops: ['GET /api/v2/events', 'GET /api/v2/events/:x'],
    sli: { kind: 'availability' },
    target: 0.995,
  },
  {
    id: 'ose.scan_fast',
    doc: 'A QR scan lands within 800 ms.',
    service: 'ose',
    ops: ['GET /q/:x'],
    sli: { kind: 'latency', thresholdMs: 800 },
    target: 0.99,
  },
];

validateSlos(SLOS); // in a test
const status = evaluateSlo(SLOS[0], { good, total }, clientTarget);
```

## Measuring

- **availability**: good = requests on the journey's ops that did not end
  `server_error` (metric `http.requests`, label `outcome`).
- **latency**: good = observations of `http.duration` under `thresholdMs`.
- Synthetic traffic is left out unless `includeSynthetic: true` (useful for a
  journey nobody uses yet).
- These are counts of requests, not people, so no floor applies, and an SLO is
  never keyed by a person.

## Budget and burn

- **Error budget** = `(1 - target) × total`: the bad requests the window
  allows. `budget_remaining` goes from 1 (untouched) to 0 (spent) and below
  (overspent).
- **Burn rate** = error rate ÷ `(1 - target)`. 1 spends the budget evenly over
  the window; level 8 pages on fast burns (for example 14.4 over an hour and
  six over six hours) and tickets on slow ones.
- A window with no traffic returns `null`, never "met".

## Client targets

Anchor and Enterprise clients may set their own target for a journey on their
configuration page. `targetFor()` uses it only when it is **the same or
stricter** than OCR's and at most 99.99%. A paid plan never weakens what
every client gets.
