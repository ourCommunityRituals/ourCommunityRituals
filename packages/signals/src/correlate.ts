/**
 * Correlation (level 5): one picture of a request, and one way to cut numbers.
 *
 * Two read-side tools, used by the console and by anyone reading Signals data:
 *
 *   correlate(lines)   Join log lines and span lines on trace_id into a tree
 *                      of spans, each with the log lines written inside it.
 *   rollup(rows, by)   Total metric rows by any view dimension (service,
 *                      client, event type, region, plan tier), leaving out
 *                      synthetic traffic and flooring counts of people.
 *
 * Plan tier is joined here, at view time, from the brand's plan history
 * (`withTier`). It is never written by a Worker, which keeps OSE's scan path
 * tier-blind (tier-equity).
 *
 * Nothing here adds data: these functions only read what levels 1 to 4 wrote,
 * and every line they read already passed the allowlists.
 */

import { floorPeople } from './metrics';

const TRACE_ID = /^[0-9a-f]{32}$/;
const SPAN_ID = /^[0-9a-f]{16}$/;

type Line = Record<string, unknown>;

export interface SpanNode {
  span_id: string;
  parent_span_id?: string;
  service?: string;
  name?: string;
  op?: string;
  ms?: number;
  outcome?: string;
  status?: number;
  ts?: string;
  /** Log lines written with this span_id, oldest first. */
  logs: Line[];
  children: SpanNode[];
}

export interface TraceView {
  trace_id: string;
  /** Spans with no parent in this set, oldest first. Usually one. */
  roots: SpanNode[];
  /** Log lines whose span_id matches no span here. */
  loose_logs: Line[];
  services: string[];
  span_count: number;
  log_count: number;
  /** Worst outcome across spans: error > timeout > cancelled > ok. */
  outcome: string;
  /** Longest root span, in ms, when known. */
  ms?: number;
}

const OUTCOME_RANK: Record<string, number> = { ok: 0, cancelled: 1, timeout: 2, error: 3 };
const str = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const byTs = (a: { ts?: unknown }, b: { ts?: unknown }) => (str(a.ts) ?? '').localeCompare(str(b.ts) ?? '');

/** Group log and span lines by trace. Lines without a valid trace_id are skipped. */
export function correlate(lines: readonly Line[]): Map<string, TraceView> {
  const byTrace = new Map<string, { spans: Line[]; logs: Line[] }>();
  for (const line of lines) {
    const trace = str(line.trace_id);
    if (!trace || !TRACE_ID.test(trace)) continue;
    const bucket = byTrace.get(trace) ?? { spans: [], logs: [] };
    byTrace.set(trace, bucket);
    if (line.kind === 'span' && SPAN_ID.test(str(line.span_id) ?? '')) bucket.spans.push(line);
    else bucket.logs.push(line);
  }

  const out = new Map<string, TraceView>();
  for (const [trace_id, { spans, logs }] of byTrace) {
    const nodes = new Map<string, SpanNode>();
    for (const s of [...spans].sort(byTs)) {
      const id = str(s.span_id) ?? '';
      if (nodes.has(id)) continue;
      const node: SpanNode = { span_id: id, logs: [], children: [] };
      const parent = str(s.parent_span_id);
      if (parent && SPAN_ID.test(parent)) node.parent_span_id = parent;
      for (const k of ['service', 'name', 'op', 'outcome', 'ts'] as const) {
        const v = str(s[k]);
        if (v !== undefined) node[k] = v;
      }
      const ms = num(s.ms);
      if (ms !== undefined) node.ms = ms;
      const status = num(s.status);
      if (status !== undefined) node.status = status;
      nodes.set(id, node);
    }
    const loose: Line[] = [];
    for (const l of [...logs].sort(byTs)) {
      const node = nodes.get(str(l.span_id) ?? '');
      if (node) node.logs.push(l);
      else loose.push(l);
    }
    const roots: SpanNode[] = [];
    for (const node of nodes.values()) {
      const parent = node.parent_span_id ? nodes.get(node.parent_span_id) : undefined;
      if (parent && parent !== node) parent.children.push(node);
      else roots.push(node);
    }
    const services = new Set<string>();
    let worst = 'ok';
    for (const n of nodes.values()) {
      if (n.service) services.add(n.service);
      if (n.outcome && (OUTCOME_RANK[n.outcome] ?? 3) > (OUTCOME_RANK[worst] ?? 0)) worst = n.outcome;
    }
    for (const l of logs) {
      const s = str(l.service);
      if (s) services.add(s);
      if (l.level === 'error' && worst === 'ok') worst = 'error';
    }
    const rootMs = roots.map((r) => r.ms).filter((m): m is number => m !== undefined);
    const view: TraceView = {
      trace_id,
      roots,
      loose_logs: loose,
      services: [...services].sort(),
      span_count: nodes.size,
      log_count: logs.length,
      outcome: worst,
    };
    if (rootMs.length > 0) view.ms = Math.max(...rootMs);
    out.set(trace_id, view);
  }
  return out;
}

/** OCR plan tiers: the code and the name people see. */
export const TIERS = { free: 'Local', mid: 'Anchor', enterprise: 'Enterprise' } as const;
export type TierCode = keyof typeof TIERS;

/** A brand's plan from a date on. `from` is an ISO date or time. */
export interface PlanChange {
  client: string;
  tier: TierCode;
  from: string;
}

/**
 * The tier a client was on at a moment, from its plan history. A client with
 * no history on or before that moment is `unknown`, never guessed.
 */
export function tierAt(history: readonly PlanChange[], client: string, at: string): TierCode | 'unknown' {
  let best: PlanChange | undefined;
  for (const p of history) {
    if (p.client !== client || p.from > at) continue;
    if (!best || p.from > best.from) best = p;
  }
  return best?.tier ?? 'unknown';
}

export interface MetricRow {
  /** Label values, as the metric wrote them (`client`, `event_type`, `region`, …). */
  labels: Record<string, string | null | undefined>;
  /** The row's total (already weighted by `_sample_interval`). */
  value: number;
  /** When the row's bucket starts; used for the tier join. */
  at?: string;
}

export interface RollupOptions {
  /** True for a people metric: synthetic rows are left out and totals floored. */
  people?: boolean;
  /** Plan history, needed when `by` includes `tier`. */
  plans?: readonly PlanChange[];
}

export interface RollupRow {
  key: Record<string, string>;
  /** The total, or null when a people total is under the floor. */
  value: number | null;
  suppressed: boolean;
}

/**
 * Total rows by the given dimensions. `tier` is joined from plan history.
 * A missing label groups as `none`. For a people metric, rows marked
 * `synthetic: 'true'` are dropped first and each group is floored after
 * summing, never before.
 */
export function rollup(rows: readonly MetricRow[], by: readonly string[], opts: RollupOptions = {}): RollupRow[] {
  const groups = new Map<string, { key: Record<string, string>; total: number }>();
  for (const row of rows) {
    if (!Number.isFinite(row.value)) continue;
    if (opts.people && row.labels.synthetic === 'true') continue;
    const key: Record<string, string> = {};
    for (const dim of by) {
      if (dim === 'tier') {
        const client = row.labels.client;
        const code = client && opts.plans && row.at ? tierAt(opts.plans, client, row.at) : 'unknown';
        key.tier = code === 'unknown' ? 'unknown' : TIERS[code];
      } else {
        key[dim] = row.labels[dim] ?? 'none';
      }
    }
    const id = by.map((d) => `${d}=${key[d] ?? ''}`).join('|');
    const g = groups.get(id) ?? { key, total: 0 };
    g.total += row.value;
    groups.set(id, g);
  }
  return [...groups.values()]
    .map(({ key, total }) => {
      if (!opts.people) return { key, value: total, suppressed: false };
      const f = floorPeople(total);
      return { key, value: f.value, suppressed: f.suppressed };
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
}
