# Signals roadmap

Eight levels, each its own pull request with tests and docs. Full design:
[OCR Signals design](https://claude.ai/artifact/WCFVR6eQz1uMzTkkNt2h5L).

| # | Level | State | Adds |
| --- | --- | --- | --- |
| 1 | Logs | Shipped (hub #98) | Envelope, schemas, two redaction layers, never-who invariant |
| 2 | Cardinality | Shipped (hub #99) | Label budgets per metric, worst-case check at definition, overflow to `other`, per-label report ([CARDINALITY.md](CARDINALITY.md)) |
| 3 | Metrics | Shipped (hub #100) | Counters and histograms to Workers Analytics Engine, guarded labels, read-side people floor ([METRICS.md](METRICS.md)); OSE's cost line becomes a metric next |
| 4 | Traces | Shipped (hub #101) | W3C `traceparent` between OCR Workers, OCR-hosts-only propagation, fixed span lines ([TRACES.md](TRACES.md)) |
| 5 | Correlation | Shipped (hub #103, library); console next | Trace trees from logs and spans, rollups by any view dimension with tier joined at view time and people floored ([CORRELATION.md](CORRELATION.md)) |
| 6 | Synthetic checks | This release | API, multi-step and browser checks on staging, marked synthetic, secrets by env name ([SYNTHETICS.md](SYNTHETICS.md)) |
| 7 | SLOs | Next | Journeys, targets and error budgets as code |
| 8 | Alerts | Planned | Rules as code, burn-rate alerts, Linear and email routes |

Every level can be viewed overall, by service, by client, by plan tier (joined
at view time), by event type and by region. Client-facing views are a paid
add-on for Anchor and Enterprise clients; the OCR team sees every client.

## Adopting level 1

- **OSE**: switch `lib/log-redact.ts` imports to `installConsoleRedaction` from
  this package, then move hand-written `console.log(JSON.stringify({ type }))`
  lines onto a registry, one area at a time.
- **OW**: replace `src/lib/logger.ts`'s `log()` with `createLogger()`; its
  REDACT_KEYS are already merged into `PERSONAL_KEYS`.
