/**
 * Metrics (level 3): counters and histograms written to Workers Analytics
 * Engine, every label checked by the cardinality guard (level 2) first.
 *
 * One data point per call. The layout is fixed so the console (level 5) can
 * query any metric the same way:
 *
 *   index1   the metric name
 *   blob1    service          blob2  env          blob3  release
 *   blob4…   the metric's labels, in its `labels` key order (layoutFor())
 *   double1  the value: the increment for a counter, the observation for a histogram
 *
 * Analytics Engine samples under load and records `_sample_interval`, so sums
 * are `SUM(_sample_interval * double1)` and counts `SUM(_sample_interval)`.
 *
 * People: a metric that counts people or their actions (scans, votes) sets
 * `people: true`. It is written exactly, like every point, because sums of
 * floored points would be wrong; the floor (under 5 withheld, then rounded
 * down to a multiple of 5) is applied where it is READ, by `floorPeople()`.
 * A people metric must declare the `synthetic` label, so Signals' own check
 * traffic can always be left out of a count of people.
 *
 * Plan tier is never a label (BANNED_LABELS): it is joined at view time.
 *
 * Telemetry never breaks a request: no method here throws.
 */

import {
  createCardinalityGuard,
  validateMetrics,
  type CardinalityReport,
  type MetricSpec,
} from './cardinality';
import { ENVS, SERVICES, type Context, type Env, type Service } from './logger';
import { PEOPLE_FLOOR } from './schema';

/** What a metric's value measures. `ms` observations are capped at one hour. */
export type MetricUnit = 'count' | 'ms' | 'bytes' | 'rows';

export interface MeteredSpec extends MetricSpec {
  /** `counter` adds; `histogram` records one observation. Default `counter`. */
  readonly kind?: 'counter' | 'histogram';
  readonly unit?: MetricUnit;
  /** True when the metric counts people or what people did. Floored on read. */
  readonly people?: boolean;
}

export type MeteredRegistry = Readonly<Record<string, MeteredSpec>>;

/** The part of an Analytics Engine dataset binding Signals uses. */
export interface AnalyticsEngineLike {
  writeDataPoint(point: { indexes?: string[]; blobs?: (string | null)[]; doubles?: number[] }): void;
}

export interface MetricsOptions<R extends MeteredRegistry> {
  service: Service;
  env: Env;
  release: string;
  metrics: R;
  /** The Analytics Engine binding. Without one, points are counted as `no_dataset` and dropped. */
  dataset?: AnalyticsEngineLike | undefined;
}

export type MetricDropReason = 'unknown_metric' | 'wrong_kind' | 'bad_value' | 'no_dataset' | 'write_failed';

export interface MetricStats {
  calls: number;
  written: number;
  /** Points written with at least one label folded to `other` or dropped. */
  folded: number;
  dropped: Record<MetricDropReason, number>;
}

type Labels = Record<string, string | number | boolean | undefined>;

export interface Metrics<R extends MeteredRegistry> {
  /** Add to a counter. `by` defaults to 1 and must be a whole number from 0. */
  count(metric: keyof R & string, labels?: Labels, by?: number): void;
  /** Record one observation of a histogram. */
  observe(metric: keyof R & string, value: number, labels?: Labels): void;
  /** A recorder that fills declared dimension labels from this context. */
  with(ctx: Context): Metrics<R>;
  stats(): MetricStats;
  /** The cardinality guard's report: budgets, distinct values seen, folds. */
  report(): CardinalityReport;
}

/** Analytics Engine allows 20 blobs; three are the envelope. */
export const MAX_METRIC_LABELS = 17;
const RELEASE_SHAPE = /^[A-Za-z0-9._-]{1,40}$/;
const MS_MAX = 3_600_000;

/** Dimension labels a context can fill, and how. */
const CONTEXT_LABELS = ['op', 'client', 'event_type', 'region'] as const;

/** Check a metered registry: the cardinality rules plus the level 3 rules. Throws with every problem. */
export function validateMeteredMetrics(metrics: MeteredRegistry): void {
  validateMetrics(metrics);
  const problems: string[] = [];
  for (const [name, spec] of Object.entries(metrics)) {
    const labels = Object.keys(spec.labels);
    if (labels.length > MAX_METRIC_LABELS) {
      problems.push(`metric "${name}": ${String(labels.length)} labels, Analytics Engine has room for ${String(MAX_METRIC_LABELS)}`);
    }
    if (labels.includes('release')) problems.push(`metric "${name}": label "release" is written by Signals`);
    if (spec.people === true && !labels.includes('synthetic')) {
      problems.push(`metric "${name}": counts people, so it must declare the synthetic label`);
    }
    if (spec.people === true && (spec.kind ?? 'counter') !== 'counter') {
      problems.push(`metric "${name}": a people metric must be a counter`);
    }
    if (name.length > 96) problems.push(`metric "${name}": name is over 96 bytes (the index limit)`);
  }
  if (problems.length > 0) throw new Error(`Signals metrics are invalid:\n- ${problems.join('\n- ')}`);
}

/** Blob position of each label, 1-based, as Analytics Engine names them (blob1…). */
export function layoutFor(spec: MetricSpec): Record<string, string> {
  const out: Record<string, string> = {};
  const names = ['service', 'env', 'release', ...Object.keys(spec.labels).filter((l) => l !== 'service' && l !== 'env')];
  names.forEach((n, i) => {
    out[n] = `blob${String(i + 1)}`;
  });
  return out;
}

export function createMetrics<R extends MeteredRegistry>(opts: MetricsOptions<R>): Metrics<R> {
  validateMeteredMetrics(opts.metrics);
  if (!(SERVICES as readonly string[]).includes(opts.service)) throw new Error(`Signals: unknown service "${opts.service}"`);
  if (!(ENVS as readonly string[]).includes(opts.env)) throw new Error(`Signals: unknown env "${opts.env}"`);
  const release = RELEASE_SHAPE.test(opts.release) ? opts.release : 'unknown';
  const guard = createCardinalityGuard(opts.metrics);
  const stats: MetricStats = {
    calls: 0,
    written: 0,
    folded: 0,
    dropped: { unknown_metric: 0, wrong_kind: 0, bad_value: 0, no_dataset: 0, write_failed: 0 },
  };

  function contextLabels(spec: MeteredSpec, ctx: Context): Labels {
    const out: Labels = {};
    for (const key of CONTEXT_LABELS) {
      if (key in spec.labels && ctx[key] !== undefined) out[key] = ctx[key];
    }
    if ('synthetic' in spec.labels) out.synthetic = ctx.synthetic === true ? 'true' : 'false';
    if ('service' in spec.labels) out.service = opts.service;
    if ('env' in spec.labels) out.env = opts.env;
    return out;
  }

  function write(ctx: Context, metric: string, kind: 'counter' | 'histogram', value: number, labels: Labels): void {
    try {
      stats.calls += 1;
      const spec = opts.metrics[metric];
      if (!spec) {
        stats.dropped.unknown_metric += 1;
        return;
      }
      if ((spec.kind ?? 'counter') !== kind) {
        stats.dropped.wrong_kind += 1;
        return;
      }
      if (!validValue(spec, kind, value)) {
        stats.dropped.bad_value += 1;
        return;
      }
      // Context wins over call labels for the dimensions it owns, so a call
      // cannot mark synthetic traffic as real or relabel its own service.
      const admitted = guard.admit(metric, { ...labels, ...contextLabels(spec, ctx) });
      if (!admitted) {
        stats.dropped.unknown_metric += 1;
        return;
      }
      if (!opts.dataset) {
        stats.dropped.no_dataset += 1;
        return;
      }
      const blobs: (string | null)[] = [opts.service, opts.env, release];
      for (const label of Object.keys(spec.labels)) {
        if (label === 'service' || label === 'env') continue;
        blobs.push(admitted.labels[label] ?? null);
      }
      opts.dataset.writeDataPoint({ indexes: [metric], blobs, doubles: [value] });
      stats.written += 1;
      if (admitted.folded) stats.folded += 1;
    } catch {
      stats.dropped.write_failed += 1;
    }
  }

  function make(ctx: Context): Metrics<R> {
    return {
      count(metric, labels = {}, by = 1) {
        write(ctx, metric, 'counter', by, labels);
      },
      observe(metric, value, labels = {}) {
        write(ctx, metric, 'histogram', value, labels);
      },
      with(more) {
        return make({ ...ctx, ...more });
      },
      stats() {
        return { ...stats, dropped: { ...stats.dropped } };
      },
      report() {
        return guard.report();
      },
    };
  }

  return make({});
}

function validValue(spec: MeteredSpec, kind: 'counter' | 'histogram', value: number): boolean {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return false;
  if (kind === 'counter') return Number.isInteger(value) && value <= Number.MAX_SAFE_INTEGER;
  if (spec.unit === 'ms') return value <= MS_MAX;
  return true;
}

/**
 * The read-side floor for a people metric's total (OSE lib/count-floor.ts):
 * under 5 is withheld (null), otherwise rounded down to a multiple of 5.
 * Apply it to every number a person can see, after summing, never before.
 */
export function floorPeople(total: number): { value: number | null; suppressed: boolean } {
  if (!Number.isFinite(total) || total < PEOPLE_FLOOR) return { value: null, suppressed: true };
  const whole = Math.floor(total);
  return { value: whole - (whole % PEOPLE_FLOOR), suppressed: false };
}
