/**
 * SLOs (level 7): what "working" means for each journey, as code.
 *
 * An SLO names a journey (a set of route patterns), how it is measured (an
 * SLI), a target over a rolling window, and so an error budget: the share of
 * requests allowed to be bad before the target is missed.
 *
 *   availability   good = requests that did not end in a server error
 *   latency        good = requests faster than `thresholdMs`
 *
 * Counts come from level 3 metrics (`http.requests`, `http.duration`) with
 * synthetic traffic left out by default. They are counts of requests, not of
 * people, so no floor applies, and an SLO never has a person in its key.
 *
 * Client targets: Anchor and Enterprise clients may set their own target for
 * a journey on their configuration page. A client target may only be the same
 * or stricter than OCR's, so a paid plan never weakens what every client gets
 * (the same rule as security: never tier-gated downwards).
 */

import { isSafeCode, OP_SHAPE } from './schema';

export interface SloSpec {
  id: string;
  doc: string;
  service: string;
  /** The route patterns that make up the journey. */
  ops: readonly string[];
  sli: { kind: 'availability' } | { kind: 'latency'; thresholdMs: number };
  /** Target share of good requests, e.g. 0.995. Between 0.9 and 0.9999. */
  target: number;
  /** Rolling window in days. Default 28. */
  windowDays?: number;
  /** Count synthetic traffic too. Default false. */
  includeSynthetic?: boolean;
}

export const DEFAULT_WINDOW_DAYS = 28;
const MIN_TARGET = 0.9;
const MAX_TARGET = 0.9999;

/** Validate SLOs. Throws with every problem. */
export function validateSlos(slos: readonly SloSpec[]): void {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const s of slos) {
    const where = `slo "${s.id}"`;
    if (!isSafeCode(s.id)) problems.push(`${where}: id must be a short code`);
    if (ids.has(s.id)) problems.push(`${where}: duplicate id`);
    ids.add(s.id);
    if (typeof s.doc !== 'string' || s.doc.trim().length < 8) problems.push(`${where}: needs a doc line`);
    if (s.ops.length === 0) problems.push(`${where}: needs at least one op`);
    for (const op of s.ops) if (!OP_SHAPE.test(op)) problems.push(`${where}: op "${op}" is not a route pattern`);
    if (!(s.target >= MIN_TARGET && s.target <= MAX_TARGET)) {
      problems.push(`${where}: target must be from ${String(MIN_TARGET)} to ${String(MAX_TARGET)}`);
    }
    const w = s.windowDays ?? DEFAULT_WINDOW_DAYS;
    if (!(Number.isInteger(w) && w >= 1 && w <= 90)) problems.push(`${where}: window must be 1 to 90 days`);
    if (s.sli.kind === 'latency' && !(s.sli.thresholdMs > 0 && s.sli.thresholdMs <= 60_000)) {
      problems.push(`${where}: latency threshold must be 1 ms to 60 s`);
    }
  }
  if (problems.length > 0) throw new Error(`Signals SLOs are invalid:\n- ${problems.join('\n- ')}`);
}

/**
 * The target that applies for a client. A client target is used only when it
 * is the same as or stricter than OCR's and within the allowed range;
 * otherwise OCR's target stands.
 */
export function targetFor(slo: SloSpec, clientTarget?: number): number {
  if (clientTarget === undefined || !Number.isFinite(clientTarget)) return slo.target;
  if (clientTarget < slo.target || clientTarget > MAX_TARGET) return slo.target;
  return clientTarget;
}

export interface SloStatus {
  slo: string;
  target: number;
  /** Share of good requests in the window, or null with no traffic. */
  sli: number | null;
  good: number;
  total: number;
  /** Bad requests the window allows: (1 - target) × total. */
  budget: number;
  /** Share of the budget left, 1 to below 0 (overspent). Null with no traffic. */
  budget_remaining: number | null;
  met: boolean | null;
}

/** Evaluate an SLO from good and total counts over its window. */
export function evaluateSlo(slo: SloSpec, counts: { good: number; total: number }, clientTarget?: number): SloStatus {
  const target = targetFor(slo, clientTarget);
  const total = Math.max(0, counts.total);
  const good = Math.min(Math.max(0, counts.good), total);
  if (total === 0) {
    return { slo: slo.id, target, sli: null, good, total, budget: 0, budget_remaining: null, met: null };
  }
  const bad = total - good;
  const budget = (1 - target) * total;
  const sli = good / total;
  return {
    slo: slo.id,
    target,
    sli,
    good,
    total,
    budget,
    budget_remaining: budget > 0 ? 1 - bad / budget : bad === 0 ? 1 : -Infinity,
    met: sli >= target,
  };
}

/**
 * Burn rate: how fast a period spends the budget, relative to spending it
 * evenly over the window. 1 spends exactly the budget by the window's end;
 * 14.4 over one hour spends 2% of a 30-day budget in that hour.
 */
export function burnRate(target: number, counts: { good: number; total: number }): number | null {
  if (counts.total <= 0) return null;
  const errorRate = (counts.total - Math.min(counts.good, counts.total)) / counts.total;
  return errorRate / (1 - target);
}
