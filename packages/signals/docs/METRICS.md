# Metrics (level 3)

Counters and histograms, written to Workers Analytics Engine. Every label goes
through the cardinality guard ([CARDINALITY.md](CARDINALITY.md)) before it is
written, so a metric can never carry a person, an id or an unbounded value.

## Declare, then record

```ts
import { createMetrics, DIMENSIONS, type MeteredRegistry } from '@ocr/signals';

const METRICS = {
  'http.requests': {
    doc: 'Requests served, by route, outcome and client.',
    labels: {
      op: DIMENSIONS.op,
      client: { kind: 'bounded', max: 20, shape: 'slug' },
      outcome: { kind: 'enum', values: ['ok', 'client_error', 'server_error'] },
    },
  },
  'http.duration': {
    doc: 'Time to serve a request, in milliseconds.',
    kind: 'histogram',
    unit: 'ms',
    labels: { op: DIMENSIONS.op },
  },
} as const satisfies MeteredRegistry;

const metrics = createMetrics({
  service: 'ose',
  env: env.WORKER_ENV,
  release: env.RELEASE,
  metrics: METRICS,
  dataset: env.SIGNALS_METRICS, // an analytics_engine_datasets binding
});

const m = metrics.with({ op: opFor(request), client: brandId });
m.count('http.requests', { outcome: 'ok' });
m.observe('http.duration', elapsedMs);
```

`with()` fills the view dimensions (`op`, `client`, `event_type`, `region`,
`synthetic`, `service`, `env`) for every metric that declares them. Context
wins over the call's own labels, so a call cannot mark Signals' check traffic
as real.

Nothing here throws. A bad value, an unknown metric, a missing binding or a
failed write is dropped and counted in `stats()`; folded labels are in
`report()`.

## Layout

One data point per call:

| Column | Holds |
| --- | --- |
| `index1` | the metric name |
| `blob1`, `blob2`, `blob3` | service, env, release |
| `blob4`… | the metric's labels, in its `labels` key order (`layoutFor(spec)`) |
| `double1` | the counter increment, or the histogram observation |

Analytics Engine samples under load, so always weight by `_sample_interval`:

```sql
-- Requests per client in the last day (blob5 = client in the example above)
SELECT blob5 AS client, SUM(_sample_interval * double1) AS requests
FROM signals_metrics
WHERE index1 = 'http.requests' AND timestamp > NOW() - INTERVAL '1' DAY
GROUP BY client

-- p95 duration per route
SELECT blob4 AS op, quantileExactWeighted(0.95)(double1, _sample_interval) AS p95_ms
FROM signals_metrics
WHERE index1 = 'http.duration' AND timestamp > NOW() - INTERVAL '1' HOUR
GROUP BY op
```

## Counting people

A metric that counts people or what they did sets `people: true`. It must be
a counter and must declare the `synthetic` label, so check traffic can always
be left out. Points are written exactly, because a sum of floored points is
wrong. The floor is applied when a number is shown: sum first, then
`floorPeople(total)`, which withholds anything under 5 and rounds the rest
down to a multiple of 5 (OSE `lib/count-floor.ts`). Always filter
`synthetic = 'false'` before flooring.

Plan tier is never a label. Views join it from the brand's plan history.
