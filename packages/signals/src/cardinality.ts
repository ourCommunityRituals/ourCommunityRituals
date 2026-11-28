/**
 * Cardinality budgets (level 2): how many distinct label values a metric may
 * carry, decided before the metric writes anything.
 *
 * Why it matters twice over:
 *   - Cost. Every distinct combination of label values is a series to store
 *     and query. A label that takes one value per request (an event id, a
 *     timestamp) multiplies series without bound.
 *   - Privacy. A label with one value per person IS a person. Budgets, closed
 *     lists and the slug rules keep a label from ever becoming an identifier.
 *
 * How it works:
 *   1. Each metric declares every label it may carry and a budget for each:
 *      a closed list (`enum`), or an open but bounded set (`bounded`, with a
 *      maximum number of distinct values and a value shape).
 *   2. At definition, the worst case (the product of every label's size) must
 *      fit the metric's `maxSeries`. A metric that could exceed it is refused
 *      with the arithmetic in the error, so it fails in tests and at deploy.
 *   3. At write time, `admit()` checks each label. An undeclared label is
 *      dropped. A value not in its list, or of the wrong shape, becomes
 *      `other`. A new value of a bounded label past its maximum also becomes
 *      `other`. Every fold is counted, so `report()` shows which label is
 *      under pressure before anyone has to guess.
 *
 * The seen-value sets live in one Worker isolate's memory. Each isolate keeps
 * its own budget, so the fleet-wide worst case is budget × isolates for a
 * bounded label; `maxSeries` is a per-isolate ceiling and the store applies
 * its own. Enum labels are exact everywhere.
 */

import { isSafeCode } from './schema';

export const OTHER = 'other';

/** A label whose values are a closed list. */
export interface EnumLabel {
  readonly kind: 'enum';
  readonly values: readonly string[];
}

/**
 * A label whose values are open but bounded: at most `max` distinct values,
 * each of the given shape. `slug` is a brand, region or catalog id
 * (`fernbrook-parks`, `etr-rec-bocce`); `op` is a route pattern; `code` is a
 * short machine code.
 */
export interface BoundedLabel {
  readonly kind: 'bounded';
  readonly max: number;
  readonly shape: 'slug' | 'op' | 'code';
}

export type LabelBudget = EnumLabel | BoundedLabel;

export interface MetricSpec {
  /** One line on what the metric measures. */
  readonly doc: string;
  readonly labels: Readonly<Record<string, LabelBudget>>;
  /** Most series this metric may make in one isolate. Default 10 000. */
  readonly maxSeries?: number;
}

export type MetricRegistry = Readonly<Record<string, MetricSpec>>;

/**
 * The view dimensions every OCR metric may use, with the budgets agreed in the
 * design doc ("Views by service, client and tier"). Spread them into a
 * metric's labels so all apps cut the same way.
 */
export const DIMENSIONS = {
  service: {
    kind: 'enum',
    values: ['ose', 'ow', 'oer', 'oa', 'osm', 'osg', 'osr', 'osp', 'hub', 'signals'],
  },
  env: { kind: 'enum', values: ['local', 'test', 'staging', 'production'] },
  client: { kind: 'bounded', max: 2000, shape: 'slug' },
  event_type: { kind: 'bounded', max: 120, shape: 'slug' },
  region: { kind: 'bounded', max: 50, shape: 'slug' },
  op: { kind: 'bounded', max: 300, shape: 'op' },
  synthetic: { kind: 'enum', values: ['true', 'false'] },
} as const satisfies Record<string, LabelBudget>;

/**
 * Labels no metric may declare, whatever its budget: each is a person, a
 * place finer than a region, a moment, or an id with one value per thing.
 * Plan tier is here too: it is joined at view time (tier-equity).
 */
export const BANNED_LABELS: readonly string[] = [
  'ip', 'user_agent', 'anon_id', 'ose_anon', 'token', 'email', 'name', 'user', 'user_id',
  'contributor_id', 'session', 'session_id', 'url', 'path', 'query', 'event_id', 'trace_id',
  'span_id', 'request_id', 'h3', 'h3_cell', 'cell', 'lat', 'lng', 'lon', 'address', 'phone',
  'timestamp', 'ts', 'date', 'tier', 'plan',
];

const METRIC_NAME = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){0,3}$/;
const LABEL_NAME = /^[a-z][a-z0-9_]{0,39}$/;
const SLUG = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const OP = /^(?:GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|CRON|QUEUE) (?:\/(?:[a-z0-9][a-z0-9_.-]{0,39}|:x))*\/?$/;
const DEFAULT_MAX_SERIES = 10_000;
const BOUNDED_CEILING = 5_000;

/** Distinct values a label can take, counting `other`. */
export function labelSize(budget: LabelBudget): number {
  return budget.kind === 'enum' ? budget.values.length + 1 : budget.max + 1;
}

/** The most series a metric can make: the product of its label sizes. */
export function worstCaseSeries(spec: MetricSpec): number {
  return Object.values(spec.labels).reduce((n, b) => n * labelSize(b), 1);
}

/** Check a registry once. Throws with every problem listed. */
export function validateMetrics(metrics: MetricRegistry): void {
  const problems: string[] = [];
  for (const [name, spec] of Object.entries(metrics)) {
    if (!METRIC_NAME.test(name)) problems.push(`metric "${name}": name must be lower dotted words`);
    if (typeof spec.doc !== 'string' || spec.doc.trim().length < 8) problems.push(`metric "${name}": needs a doc line`);
    for (const [label, b] of Object.entries(spec.labels)) {
      if (!LABEL_NAME.test(label)) problems.push(`metric "${name}": label "${label}" must be lower snake case`);
      if (BANNED_LABELS.includes(label)) problems.push(`metric "${name}": label "${label}" is banned (never who, never per-thing)`);
      if (b.kind === 'enum') {
        if (b.values.length === 0 || b.values.length > 64) problems.push(`metric "${name}": enum "${label}" needs 1 to 64 values`);
        if (b.values.includes(OTHER)) problems.push(`metric "${name}": enum "${label}" may not list "${OTHER}"`);
      } else if (!(Number.isInteger(b.max) && b.max >= 1 && b.max <= BOUNDED_CEILING)) {
        problems.push(`metric "${name}": bounded "${label}" needs a whole max from 1 to ${String(BOUNDED_CEILING)}`);
      }
    }
    const max = spec.maxSeries ?? DEFAULT_MAX_SERIES;
    const worst = worstCaseSeries(spec);
    if (worst > max) {
      const sizes = Object.entries(spec.labels)
        .map(([l, b]) => `${l} ${String(labelSize(b))}`)
        .join(' × ');
      problems.push(`metric "${name}": worst case ${String(worst)} series (${sizes}) is over its budget of ${String(max)}`);
    }
  }
  if (problems.length > 0) throw new Error(`Signals metrics are over budget or invalid:\n- ${problems.join('\n- ')}`);
}

export type FoldReason = 'undeclared' | 'not_in_list' | 'bad_shape' | 'over_budget' | 'unknown_metric';

export interface LabelReport {
  budget: number;
  seen: number;
  folded: number;
}

export interface MetricReport {
  worst_case: number;
  max_series: number;
  series_seen: number;
  labels: Record<string, LabelReport>;
}

export interface CardinalityReport {
  metrics: Record<string, MetricReport>;
  folds: Record<FoldReason, number>;
}

export interface Admitted {
  /** The labels to write, every value within budget. */
  labels: Record<string, string>;
  /** True when any value was folded or dropped. */
  folded: boolean;
}

export interface CardinalityGuard {
  /** Check one write's labels against the metric's budgets. Never throws. */
  admit(metric: string, labels: Record<string, string | number | boolean | undefined>): Admitted | null;
  /** Budgets, distinct values seen and folds, per metric and label. */
  report(): CardinalityReport;
}

export function createCardinalityGuard(metrics: MetricRegistry): CardinalityGuard {
  validateMetrics(metrics);
  const seen = new Map<string, Map<string, Set<string>>>();
  const folded = new Map<string, Map<string, number>>();
  const series = new Map<string, Set<string>>();
  const folds: Record<FoldReason, number> = {
    undeclared: 0,
    not_in_list: 0,
    bad_shape: 0,
    over_budget: 0,
    unknown_metric: 0,
  };

  const bump = (metric: string, label: string, reason: FoldReason) => {
    folds[reason] += 1;
    const m = folded.get(metric) ?? new Map<string, number>();
    m.set(label, (m.get(label) ?? 0) + 1);
    folded.set(metric, m);
  };

  return {
    admit(metric, raw) {
      try {
        const spec = metrics[metric];
        if (!spec) {
          folds.unknown_metric += 1;
          return null;
        }
        const out: Record<string, string> = {};
        let didFold = false;
        for (const [label, value] of Object.entries(raw)) {
          if (value === undefined) continue;
          if (!(label in spec.labels)) {
            bump(metric, label, 'undeclared');
            didFold = true;
          }
        }
        for (const [label, budget] of Object.entries(spec.labels)) {
          const rawValue = raw[label];
          if (rawValue === undefined) continue;
          const value = String(rawValue);
          let kept = value;
          if (budget.kind === 'enum') {
            if (!budget.values.includes(value)) {
              kept = OTHER;
              bump(metric, label, 'not_in_list');
            }
          } else if (!fitsShape(budget.shape, value)) {
            kept = OTHER;
            bump(metric, label, 'bad_shape');
          } else {
            const byLabel = seen.get(metric) ?? new Map<string, Set<string>>();
            seen.set(metric, byLabel);
            const values = byLabel.get(label) ?? new Set<string>();
            byLabel.set(label, values);
            if (!values.has(value)) {
              if (values.size >= budget.max) {
                kept = OTHER;
                bump(metric, label, 'over_budget');
              } else {
                values.add(value);
              }
            }
          }
          if (kept !== value) didFold = true;
          out[label] = kept;
        }
        const key = Object.keys(out)
          .sort()
          .map((k) => `${k}=${out[k] ?? ''}`)
          .join('|');
        const s = series.get(metric) ?? new Set<string>();
        s.add(key);
        series.set(metric, s);
        return { labels: out, folded: didFold };
      } catch {
        return null;
      }
    },
    report() {
      const out: Record<string, MetricReport> = {};
      for (const [name, spec] of Object.entries(metrics)) {
        const labels: Record<string, LabelReport> = {};
        for (const [label, budget] of Object.entries(spec.labels)) {
          labels[label] = {
            budget: budget.kind === 'enum' ? budget.values.length : budget.max,
            seen: budget.kind === 'enum' ? budget.values.length : (seen.get(name)?.get(label)?.size ?? 0),
            folded: folded.get(name)?.get(label) ?? 0,
          };
        }
        out[name] = {
          worst_case: worstCaseSeries(spec),
          max_series: spec.maxSeries ?? DEFAULT_MAX_SERIES,
          series_seen: series.get(name)?.size ?? 0,
          labels,
        };
      }
      return { metrics: out, folds: { ...folds } };
    },
  };
}

function fitsShape(shape: BoundedLabel['shape'], value: string): boolean {
  switch (shape) {
    case 'slug':
      return (
        SLUG.test(value) &&
        !/\d{7,}/.test(value) &&
        !/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value) &&
        !/(?:^|[_-])[0-9a-f]{12,}(?:$|[_-])/i.test(value)
      );
    case 'op':
      return OP.test(value);
    case 'code':
      return isSafeCode(value);
  }
}
