# Signals roadmap

Eight levels, each its own pull request with tests and docs. Full design:
[OCR Signals design](https://claude.ai/artifact/WCFVR6eQz1uMzTkkNt2h5L).

| # | Level | State | Adds |
| --- | --- | --- | --- |
| 1 | Logs | This release | Envelope, schemas, two redaction layers, never-who invariant |
| 2 | Cardinality | Next | Label budgets per metric, overflow to `other`, CI check on undeclared labels |
| 3 | Metrics | Planned | Counters and histograms to Workers Analytics Engine; OSE's cost line becomes a metric |
| 4 | Traces | Planned | W3C `traceparent` between OCR Workers; span lines |
| 5 | Correlation | Planned | Shared ids across logs, metrics and spans; first console view |
| 6 | Synthetic checks | Planned | API, multi-step and browser checks on staging, marked synthetic |
| 7 | SLOs | Planned | Journeys, targets and error budgets as code |
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
