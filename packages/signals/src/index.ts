/**
 * @ocr/signals — OCR's own observability.
 *
 * Level 1: privacy-safe structured logs.
 * Level 2: cardinality budgets for metric labels.
 * Level 3: counters and histograms to Workers Analytics Engine.
 * Level 4: W3C trace context between OCR Workers, and span lines.
 * Level 5: correlation of logs and spans by trace, and rollups by any view dimension.
 * Level 7: SLOs as code, error budgets and burn rates.
 * Rules and how-to: packages/signals/docs/.
 */

export { createLogger, isClientId, SERVICES, ENVS } from './logger';
export type { Context, DropStats, Env, Logger, LoggerOptions, LogLine, Service, Sink } from './logger';
export { checkField, isSafeCode, validateRegistry, PEOPLE_FLOOR, RESERVED_FIELDS } from './schema';
export type { DropReason, EventRegistry, EventSpec, FieldSpec, Level } from './schema';
export { opFor, cronOp } from './op';
export { errorFields } from './error';
export type { ErrorFields } from './error';
export {
  installConsoleRedaction,
  isConsoleRedactionInstalled,
  isCredentialKey,
  isMaskedKey,
  redact,
  redactText,
  REDACTED,
  CREDENTIAL_HEADERS,
} from './redact/credentials';
export { isPersonalKey, scrubText, PERSONAL_KEYS, ERROR_TEXT_MAX } from './redact/personal';
export {
  createCardinalityGuard,
  validateMetrics,
  worstCaseSeries,
  labelSize,
  DIMENSIONS,
  BANNED_LABELS,
  OTHER,
} from './cardinality';
export type {
  Admitted,
  BoundedLabel,
  CardinalityGuard,
  CardinalityReport,
  EnumLabel,
  FoldReason,
  LabelBudget,
  LabelReport,
  MetricRegistry,
  MetricReport,
  MetricSpec,
} from './cardinality';
export { createMetrics, floorPeople, layoutFor, validateMeteredMetrics, MAX_METRIC_LABELS } from './metrics';
export type {
  AnalyticsEngineLike,
  MeteredRegistry,
  MeteredSpec,
  MetricDropReason,
  Metrics,
  MetricsOptions,
  MetricStats,
  MetricUnit,
} from './metrics';
export {
  childOf,
  createTracer,
  formatTraceparent,
  inject,
  newSpanId,
  newTraceId,
  parseTraceparent,
  traceFrom,
} from './traces';
export type { Span, SpanLine, SpanOutcome, TraceContext, Tracer, TracerOptions, TracerStats } from './traces';
export { correlate, rollup, tierAt, TIERS } from './correlate';
export type { MetricRow, PlanChange, RollupOptions, RollupRow, SpanNode, TierCode, TraceView } from './correlate';
export { burnRate, evaluateSlo, targetFor, validateSlos, DEFAULT_WINDOW_DAYS } from './slo';
export type { SloSpec, SloStatus } from './slo';
