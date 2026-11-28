/**
 * Alerts (level 8): rules as code that turn signals into a page or a ticket.
 *
 * Three kinds of rule:
 *   - burn       an SLO's error budget is burning too fast, read over a long
 *                and a short window together so a blip does not page and a
 *                recovered problem stops paging quickly (multi-window burn);
 *   - threshold  a metric total crosses a line for N evaluations in a row;
 *   - check      a synthetic check fails N runs in a row.
 *
 * An alert says what and how much, never who:
 *   - Its text is built from fixed templates and numbers. A rule has no
 *     free-text field that reaches the message.
 *   - It may name a service, a journey, a check and a client (brand slug),
 *     never a person, a path or an id.
 *   - A threshold on a people metric compares the FLOORED value (under 5 is
 *     withheld and never fires), so an alert can't reveal one person's action.
 *   - Routes name a contact list by id (`ocr-oncall`, or a client's list from
 *     its configuration page); addresses live in that list, not in rules.
 *
 * The alerter fires on a change of state (ok → firing, firing → resolved),
 * repeats a firing alert no more than every `repeatMinutes`, and never throws:
 * a route that fails is counted.
 */

import { isClientId } from './logger';
import { floorPeople } from './metrics';
import { isSafeCode } from './schema';

export type Severity = 'page' | 'ticket';

export interface Route {
  /** Where it goes. The Worker supplies the sender for each channel. */
  channel: 'linear' | 'email';
  /** A contact list id, e.g. `ocr-oncall`, or a client's list. Never an address. */
  contacts: string;
}

interface RuleBase {
  id: string;
  doc: string;
  service: string;
  routes: readonly Route[];
  /** Minimum minutes between repeats of a firing alert. Default 60. */
  repeatMinutes?: number;
}

/** One window pair: fires when both windows burn faster than `rate`. */
export interface BurnWindow {
  longMinutes: number;
  shortMinutes: number;
  rate: number;
  severity: Severity;
}

export interface BurnRule extends RuleBase {
  kind: 'burn';
  slo: string;
  target: number;
  /** Default: page at 14.4× over 60/5 min, ticket at 6× over 360/30 min. */
  windows?: readonly BurnWindow[];
}

export interface ThresholdRule extends RuleBase {
  kind: 'threshold';
  metric: string;
  op: '>' | '<';
  value: number;
  /** Evaluations in a row before it fires. Default 3. */
  forCount?: number;
  severity: Severity;
  /** The metric counts people: compare the floored value. */
  people?: boolean;
}

export interface CheckRule extends RuleBase {
  kind: 'check';
  check: string;
  /** Failed runs in a row before it fires. Default 2. */
  failures?: number;
  severity: Severity;
}

export type AlertRule = BurnRule | ThresholdRule | CheckRule;

export const DEFAULT_BURN_WINDOWS: readonly BurnWindow[] = [
  { longMinutes: 60, shortMinutes: 5, rate: 14.4, severity: 'page' },
  { longMinutes: 360, shortMinutes: 30, rate: 6, severity: 'ticket' },
];

const CONTACTS = /^[a-z0-9][a-z0-9_-]{1,63}$/;

/** Validate rules. Throws with every problem. */
export function validateRules(rules: readonly AlertRule[]): void {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const r of rules) {
    const where = `rule "${r.id}"`;
    if (!isSafeCode(r.id)) problems.push(`${where}: id must be a short code`);
    if (ids.has(r.id)) problems.push(`${where}: duplicate id`);
    ids.add(r.id);
    if (typeof r.doc !== 'string' || r.doc.trim().length < 8) problems.push(`${where}: needs a doc line`);
    if (r.routes.length === 0) problems.push(`${where}: needs a route`);
    for (const route of r.routes) {
      if (!CONTACTS.test(route.contacts)) problems.push(`${where}: contacts must be a contact list id, never an address`);
    }
    if (r.kind === 'burn') {
      if (!isSafeCode(r.slo)) problems.push(`${where}: slo must be an SLO id`);
      if (!(r.target > 0 && r.target < 1)) problems.push(`${where}: target must be between 0 and 1`);
      for (const w of r.windows ?? []) {
        if (!(w.shortMinutes > 0 && w.shortMinutes < w.longMinutes && w.rate > 0)) {
          problems.push(`${where}: each window needs 0 < short < long and a rate above 0`);
        }
      }
    } else if (r.kind === 'threshold') {
      if (!isSafeCode(r.metric)) problems.push(`${where}: metric must be a metric name`);
      if (!Number.isFinite(r.value)) problems.push(`${where}: value must be a number`);
      if (r.people && r.op === '<') problems.push(`${where}: a people rule may not fire on a small count`);
    } else if (!isSafeCode(r.check)) {
      problems.push(`${where}: check must be a check id`);
    }
  }
  if (problems.length > 0) throw new Error(`Signals alert rules are invalid:\n- ${problems.join('\n- ')}`);
}

/** What the evaluator is given for one rule (and optionally one client). */
export type RuleInput =
  | { kind: 'burn'; windows: Readonly<Record<number, { good: number; total: number }>> }
  | { kind: 'threshold'; value: number }
  | { kind: 'check'; ok: boolean };

export interface Alert {
  rule: string;
  state: 'firing' | 'resolved';
  severity: Severity;
  service: string;
  client?: string;
  /** Built from a fixed template and numbers. */
  summary: string;
  at: string;
}

export interface AlerterOptions {
  rules: readonly AlertRule[];
  /** Sends an alert down one route. May throw; failures are counted. */
  send: (route: Route, alert: Alert) => Promise<void> | void;
  now?: () => Date;
}

export interface AlerterStats {
  evaluations: number;
  fired: number;
  resolved: number;
  repeats: number;
  send_failed: number;
  bad_input: number;
}

export interface Alerter {
  /** Evaluate one rule for one input; sends on a change of state. */
  evaluate(ruleId: string, input: RuleInput, client?: string): Promise<'firing' | 'ok'>;
  stats(): AlerterStats;
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
const burn = (target: number, c: { good: number; total: number } | undefined): number | null =>
  c && c.total > 0 ? (c.total - Math.min(c.good, c.total)) / c.total / (1 - target) : null;

export function createAlerter(opts: AlerterOptions): Alerter {
  validateRules(opts.rules);
  const rules = new Map(opts.rules.map((r) => [r.id, r]));
  const now = opts.now ?? (() => new Date());
  const streak = new Map<string, number>();
  const firing = new Map<string, { severity: Severity; lastSent: number }>();
  const stats: AlerterStats = { evaluations: 0, fired: 0, resolved: 0, repeats: 0, send_failed: 0, bad_input: 0 };

  async function deliver(rule: AlertRule, alert: Alert): Promise<void> {
    for (const route of rule.routes) {
      try {
        await opts.send(route, alert);
      } catch {
        stats.send_failed += 1;
      }
    }
  }

  function decide(rule: AlertRule, input: RuleInput, key: string): { severity: Severity; summary: string } | null {
    if (rule.kind === 'burn' && input.kind === 'burn') {
      for (const w of rule.windows ?? DEFAULT_BURN_WINDOWS) {
        const long = burn(rule.target, input.windows[w.longMinutes]);
        const short = burn(rule.target, input.windows[w.shortMinutes]);
        if (long !== null && short !== null && long > w.rate && short > w.rate) {
          return {
            severity: w.severity,
            summary: `SLO ${rule.slo} is burning its error budget at ${fmt(long)}x over ${String(w.longMinutes)} min (alert above ${fmt(w.rate)}x).`,
          };
        }
      }
      return null;
    }
    if (rule.kind === 'threshold' && input.kind === 'threshold') {
      let value: number | null = input.value;
      if (rule.people) value = floorPeople(input.value).value;
      const hit = value !== null && (rule.op === '>' ? value > rule.value : value < rule.value);
      const n = hit ? (streak.get(key) ?? 0) + 1 : 0;
      streak.set(key, n);
      if (!hit || n < (rule.forCount ?? 3) || value === null) return null;
      return {
        severity: rule.severity,
        summary: `${rule.metric} is ${fmt(value)}, ${rule.op === '>' ? 'above' : 'below'} ${fmt(rule.value)} for ${String(n)} checks in a row.`,
      };
    }
    if (rule.kind === 'check' && input.kind === 'check') {
      const n = input.ok ? 0 : (streak.get(key) ?? 0) + 1;
      streak.set(key, n);
      if (n < (rule.failures ?? 2)) return null;
      return { severity: rule.severity, summary: `Check ${rule.check} has failed ${String(n)} runs in a row.` };
    }
    stats.bad_input += 1;
    return null;
  }

  return {
    async evaluate(ruleId, input, client) {
      stats.evaluations += 1;
      const rule = rules.get(ruleId);
      if (!rule || (client !== undefined && !isClientId(client))) {
        stats.bad_input += 1;
        return 'ok';
      }
      const key = `${ruleId}|${client ?? ''}`;
      const verdict = decide(rule, input, key);
      const at = now();
      const base = { rule: rule.id, service: rule.service, at: at.toISOString(), ...(client ? { client } : {}) };
      const was = firing.get(key);
      if (verdict) {
        const repeatMs = (rule.repeatMinutes ?? 60) * 60_000;
        if (!was) {
          firing.set(key, { severity: verdict.severity, lastSent: at.getTime() });
          stats.fired += 1;
          await deliver(rule, { ...base, state: 'firing', severity: verdict.severity, summary: verdict.summary });
        } else if (at.getTime() - was.lastSent >= repeatMs || verdict.severity !== was.severity) {
          firing.set(key, { severity: verdict.severity, lastSent: at.getTime() });
          stats.repeats += 1;
          await deliver(rule, { ...base, state: 'firing', severity: verdict.severity, summary: verdict.summary });
        }
        return 'firing';
      }
      if (was) {
        firing.delete(key);
        stats.resolved += 1;
        await deliver(rule, { ...base, state: 'resolved', severity: was.severity, summary: `Resolved: ${rule.id} is back within its limits.` });
      }
      return 'ok';
    },
    stats() {
      return { ...stats };
    },
  };
}
