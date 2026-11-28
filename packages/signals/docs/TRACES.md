# Traces (level 4)

Follow one request across OCR Workers with W3C Trace Context, and write one
span line per unit of work.

## In a Worker

```ts
import { createLogger, createTracer, inject, opFor, traceFrom } from '@ocr/signals';

const tracer = createTracer({ service: 'ose', env: env.WORKER_ENV, release: env.RELEASE });
const OCR_HOSTS = ['oursharedevents.com', 'ourwkrp.com', 'workers.dev'];

export default {
  async fetch(request, env) {
    const trace = traceFrom(request.headers);           // continue the caller's trace, or start one
    const op = opFor(request.method, request.url, WORDS);
    const log = logger.with({ op, trace_id: trace.trace_id, span_id: trace.span_id });

    const events = await tracer.run('d1.events', trace, () => db.prepare(SQL).all(), op);

    // Calling another OCR Worker: the trace goes with it.
    const res = await fetch(OW_URL, { headers: inject(OW_URL, trace, OCR_HOSTS) });
    …
  },
};
```

`tracer.start(name, ctx, op?)` returns a span; call `span.end(outcome?, status?)`
when the work is done. `tracer.run()` does both and marks a throw as `error`.

## A span line

```json
{ "ts": "2026-11-28T12:00:00.000Z", "kind": "span", "service": "ose", "env": "staging",
  "release": "abc1234", "trace_id": "4bf9…4736", "span_id": "…", "parent_span_id": "…",
  "name": "d1.events", "ms": 42, "outcome": "ok", "op": "GET /api/v2/events/:x", "status": 200 }
```

Log lines written with the same `trace_id` and `span_id` join to it (level 5).

## Rules

- **Ids name a request, never a person.** They are random, never derived from
  the caller, and a trace id is not a label (it is in `BANNED_LABELS`).
- **Only OCR hosts get `traceparent`.** `inject()` sets it for an exact OCR
  host or a subdomain of one, and removes it for anything else, so a trace id
  never reaches a third party. `evil-oursharedevents.com` is not ours.
- **`tracestate` is never read or forwarded.** It is vendor free text.
- **A span carries no fields.** Its name is a short code (no ids, emails or
  numbers), its op a route pattern (`opFor()`), and the rest is fixed: time,
  outcome, status. A bad name drops the line; a bad op drops the op. Both are
  counted in `stats()`.
- **Sampling follows the caller.** An incoming `traceparent` with the sampled
  flag off writes no span lines; a new trace is sampled.
- Nothing throws. A sink that fails is counted, and `run()` still returns or
  rethrows the work's own result.
