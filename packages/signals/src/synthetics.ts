/**
 * Synthetic checks (level 6): Signals visits OCR's own surfaces on a schedule
 * and says whether each journey works, before a person finds out.
 *
 * Three kinds, all declared as code:
 *   - api      one request and its assertions;
 *   - multi    several requests in order, where a step may carry a value from
 *              an earlier response into a later path;
 *   - browser  a front-end flow, declared here and run by Playwright in CI
 *              (this module validates it; it does not drive a browser).
 *
 * Rules that make a check safe to run against real systems:
 *   - **Marked.** Every request carries `x-ocr-synthetic: 1` and a fresh
 *     `traceparent`, and every result is written with `synthetic: true`, so a
 *     check is never counted as a person (level 3 people metrics require the
 *     synthetic label; level 5 rollups drop it).
 *   - **Own hosts only.** A check may target only hosts in `allowedHosts`.
 *     Production is closed until the owner opens it, so the default list is
 *     staging's.
 *   - **No secrets in definitions.** A step names the env var that holds its
 *     credential (`auth: { env: 'SIGNALS_CHECK_TOKEN' }`); the runner reads it
 *     at run time and it never appears in a result.
 *   - **Results carry no response data.** Only status, time, which assertion
 *     failed (as a code) and the step's name. A carried value lives in memory
 *     for the run and is never written.
 */

import { isSafeCode, OP_SHAPE } from './schema';
import { formatTraceparent, newSpanId, newTraceId } from './traces';

export const SYNTHETIC_HEADER = 'x-ocr-synthetic';
export const STAGING_HOSTS: readonly string[] = ['stg.oursharedevents.com', 'stg.ourwkrp.com'];

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
type Method = (typeof METHODS)[number];
const ENV_NAME = /^[A-Z][A-Z0-9_]{2,63}$/;
const PATH = /^\/[A-Za-z0-9._~\-/{}:%]*$/;
const JSON_PATH = /^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*|\[\d{1,3}\])*$/;
const VAR = /\{([a-z][a-z0-9_]{0,31})\}/g;

export interface Expect {
  /** Allowed status codes. Default [200]. */
  status?: readonly number[];
  /** Slowest acceptable response, ms. */
  maxMs?: number;
  /** JSON paths that must be present (and not null) in the body. */
  jsonHas?: readonly string[];
  /** Header that must be present, e.g. `content-type`. */
  header?: string;
}

export interface Step {
  /** A short code naming the step (`list_events`). */
  name: string;
  method?: Method;
  /** A path on the check's host. `{var}` takes a value carried from an earlier step. */
  path: string;
  /** The route pattern this step exercises, for joining with logs and metrics. */
  op?: string;
  /** JSON body, for POST/PUT/PATCH. Fixed test data only. */
  body?: unknown;
  auth?: { env: string; scheme?: 'Bearer' };
  expect?: Expect;
  /** Carry values from this response into later steps: var name → JSON path. */
  carry?: Readonly<Record<string, string>>;
}

export interface ApiCheck {
  kind: 'api';
  id: string;
  doc: string;
  service: string;
  host: string;
  step: Step;
}

export interface MultiCheck {
  kind: 'multi';
  id: string;
  doc: string;
  service: string;
  host: string;
  steps: readonly Step[];
}

/** A front-end flow, run by Playwright in CI. `spec` is the test file that drives it. */
export interface BrowserCheck {
  kind: 'browser';
  id: string;
  doc: string;
  service: string;
  host: string;
  spec: string;
  /** Pages visited, as route patterns, so results join with server signals. */
  ops: readonly string[];
}

export type Check = ApiCheck | MultiCheck | BrowserCheck;

/** Validate a set of checks. Throws with every problem, so a bad check fails in tests. */
export function validateChecks(checks: readonly Check[], allowedHosts: readonly string[] = STAGING_HOSTS): void {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const c of checks) {
    const where = `check "${c.id}"`;
    if (!isSafeCode(c.id)) problems.push(`${where}: id must be a short code`);
    if (ids.has(c.id)) problems.push(`${where}: duplicate id`);
    ids.add(c.id);
    if (typeof c.doc !== 'string' || c.doc.trim().length < 8) problems.push(`${where}: needs a doc line`);
    if (!allowedHosts.includes(c.host)) problems.push(`${where}: host "${c.host}" is not an allowed check host`);
    if (c.kind === 'browser') {
      if (!/^tests\/[A-Za-z0-9_./-]+\.spec\.ts$/.test(c.spec)) problems.push(`${where}: spec must be a tests/…spec.ts path`);
      for (const op of c.ops) if (!OP_SHAPE.test(op)) problems.push(`${where}: op "${op}" is not a route pattern`);
      continue;
    }
    const steps = c.kind === 'api' ? [c.step] : c.steps;
    if (steps.length === 0 || steps.length > 20) problems.push(`${where}: needs 1 to 20 steps`);
    const carried = new Set<string>();
    for (const s of steps) {
      const at = `${where} step "${s.name}"`;
      if (!isSafeCode(s.name)) problems.push(`${at}: name must be a short code`);
      if (!PATH.test(s.path) || s.path.includes('..') || s.path.includes('?')) {
        problems.push(`${at}: path must be a plain path with no query string`);
      }
      for (const m of s.path.matchAll(VAR)) {
        if (!carried.has(m[1] ?? '')) problems.push(`${at}: {${m[1] ?? ''}} is not carried by an earlier step`);
      }
      if (s.method !== undefined && !(METHODS as readonly string[]).includes(s.method)) problems.push(`${at}: unknown method`);
      if (s.op !== undefined && !OP_SHAPE.test(s.op)) problems.push(`${at}: op is not a route pattern`);
      if (s.auth && !ENV_NAME.test(s.auth.env)) problems.push(`${at}: auth must name an env var, never hold a secret`);
      for (const [v, p] of Object.entries(s.carry ?? {})) {
        if (!/^[a-z][a-z0-9_]{0,31}$/.test(v)) problems.push(`${at}: carry name "${v}" must be lower snake case`);
        if (!JSON_PATH.test(p)) problems.push(`${at}: carry path "${p}" is not a JSON path`);
        carried.add(v);
      }
      for (const p of s.expect?.jsonHas ?? []) if (!JSON_PATH.test(p)) problems.push(`${at}: jsonHas "${p}" is not a JSON path`);
      if (c.kind === 'api' && s.carry) problems.push(`${at}: an api check has one step; use multi to carry values`);
    }
  }
  if (problems.length > 0) throw new Error(`Signals checks are invalid:\n- ${problems.join('\n- ')}`);
}

export type StepFailure =
  | 'status'
  | 'slow'
  | 'json_missing'
  | 'header_missing'
  | 'not_json'
  | 'network'
  | 'missing_secret'
  | 'carry_missing';

export interface StepResult {
  name: string;
  op?: string;
  status?: number;
  ms: number;
  ok: boolean;
  failure?: StepFailure;
}

export interface CheckResult {
  check: string;
  kind: Check['kind'];
  service: string;
  synthetic: true;
  trace_id: string;
  ok: boolean;
  ms: number;
  steps: StepResult[];
  /** The first step that failed, if any. */
  failed_step?: string;
}

export interface RunOptions {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  /** Where `auth.env` names are looked up. Values never leave the runner. */
  env?: Readonly<Record<string, string | undefined>>;
  now?: () => number;
  /** Per-request timeout, ms. Default 10 000. */
  timeoutMs?: number;
}

function readPath(body: unknown, path: string): unknown {
  let cur: unknown = body;
  for (const part of path.split(/\.|(?=\[)/)) {
    if (cur === null || cur === undefined) return undefined;
    const idx = /^\[(\d+)\]$/.exec(part);
    if (idx) cur = Array.isArray(cur) ? cur[Number(idx[1])] : undefined;
    else cur = typeof cur === 'object' ? (cur as Record<string, unknown>)[part] : undefined;
  }
  return cur;
}

/** Run an api or multi check. Never throws; a browser check is refused (run it with Playwright). */
export async function runCheck(check: ApiCheck | MultiCheck, opts: RunOptions): Promise<CheckResult> {
  const now = opts.now ?? (() => Date.now());
  const trace_id = newTraceId();
  const t0 = now();
  const steps = check.kind === 'api' ? [check.step] : check.steps;
  const vars = new Map<string, string>();
  const results: StepResult[] = [];

  for (const step of steps) {
    const s0 = now();
    const result: StepResult = { name: step.name, ms: 0, ok: false };
    if (step.op) result.op = step.op;
    const fail = (failure: StepFailure) => {
      result.failure = failure;
      result.ms = Math.max(0, Math.round(now() - s0));
      results.push(result);
    };
    if ([...step.path.matchAll(VAR)].some((m) => !vars.has(m[1] ?? ''))) {
      fail('carry_missing');
      break;
    }
    const path = step.path.replace(VAR, (_, v: string) => encodeURIComponent(vars.get(v) ?? ''));
    const headers: Record<string, string> = {
      [SYNTHETIC_HEADER]: '1',
      traceparent: formatTraceparent({ trace_id, span_id: newSpanId(), sampled: true }),
      accept: 'application/json, text/html;q=0.9',
    };
    if (step.auth) {
      const secret = opts.env?.[step.auth.env];
      if (!secret) {
        fail('missing_secret');
        break;
      }
      headers.authorization = `${step.auth.scheme ?? 'Bearer'} ${secret}`;
    }
    const init: RequestInit = { method: step.method ?? 'GET', headers, redirect: 'manual' };
    if (step.body !== undefined) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(step.body);
    }
    let res: Response;
    try {
      const signal = AbortSignal.timeout(opts.timeoutMs ?? 10_000);
      res = await opts.fetch(`https://${check.host}${path}`, { ...init, signal });
    } catch {
      fail('network');
      break;
    }
    result.status = res.status;
    const ms = Math.max(0, Math.round(now() - s0));
    const exp = step.expect ?? {};
    const needsJson = (exp.jsonHas?.length ?? 0) > 0 || Object.keys(step.carry ?? {}).length > 0;
    let body: unknown;
    if (needsJson) {
      try {
        body = await res.json();
      } catch {
        fail('not_json');
        break;
      }
    }
    if (!(exp.status ?? [200]).includes(res.status)) {
      fail('status');
      break;
    }
    if (exp.maxMs !== undefined && ms > exp.maxMs) {
      fail('slow');
      break;
    }
    if (exp.header && !res.headers.has(exp.header)) {
      fail('header_missing');
      break;
    }
    if ((exp.jsonHas ?? []).some((p) => readPath(body, p) == null)) {
      fail('json_missing');
      break;
    }
    let carryMissing = false;
    for (const [v, p] of Object.entries(step.carry ?? {})) {
      const val = readPath(body, p);
      if (typeof val === 'string' || typeof val === 'number') vars.set(v, String(val));
      else carryMissing = true;
    }
    if (carryMissing) {
      fail('carry_missing');
      break;
    }
    result.ok = true;
    result.ms = ms;
    results.push(result);
  }

  const ok = results.length === steps.length && results.every((r) => r.ok);
  const out: CheckResult = {
    check: check.id,
    kind: check.kind,
    service: check.service,
    synthetic: true,
    trace_id,
    ok,
    ms: Math.max(0, Math.round(now() - t0)),
    steps: results,
  };
  const failed = results.find((r) => !r.ok);
  if (failed) out.failed_step = failed.name;
  return out;
}
