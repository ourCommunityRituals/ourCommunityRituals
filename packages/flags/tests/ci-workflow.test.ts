/**
 * CI workflow meta-tests — lock the COST-211/212 waste-collapse invariants so a
 * future edit can't silently regress them.
 *
 * COST-211 (single authoritative install + shared pnpm store): the pnpm store
 *   is shared across the gate and invariants jobs (same cache key), and every
 *   `pnpm install` still runs with `--frozen-lockfile` — reuse the store, never
 *   skip the integrity check. A tampered lockfile still fails CI because the
 *   frozen-lockfile install is retained.
 *
 * COST-212 (invariants run once, dedicated gate stays authoritative): the gate
 *   job runs the vitest suite with invariants EXCLUDED, and the dedicated
 *   `invariants` job is the single place `invariants.test.ts` executes. Deleting
 *   an invariant still turns the invariants job red — it just no longer runs
 *   twice.
 *
 * These parse .github/workflows/ci.yml (and this package's package.json)
 * directly, so drift between the intended CI shape and the actual workflow fails
 * here rather than silently reintroducing the double-run or a cold install.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CI_PATH = resolve(__dirname, '../../../.github/workflows/ci.yml');
const PKG_PATH = resolve(__dirname, '../package.json');

const raw = readFileSync(CI_PATH, 'utf8');
const wf = yaml.load(raw) as { jobs?: Record<string, { steps?: Array<{ run?: string; uses?: string }> }> };
const jobs = wf.jobs ?? {};

const runsOf = (jobName: string): string[] =>
  (jobs[jobName]?.steps ?? []).map((s) => s.run ?? '').filter(Boolean);
const usesOf = (jobName: string): string[] =>
  (jobs[jobName]?.steps ?? []).map((s) => s.uses ?? '').filter(Boolean);

const STORE_KEY = 'pnpm-store-${{ runner.os }}-${{ steps.lockhash.outputs.HASH }}';

describe('COST-211 — single authoritative install + shared pnpm store', () => {
  it('the gate and invariants jobs both exist', () => {
    expect(jobs.gate, 'gate job must exist').toBeDefined();
    expect(jobs.invariants, 'invariants job must exist').toBeDefined();
  });

  it('every `pnpm install` retains --frozen-lockfile (no bare install path)', () => {
    // Scan actual step `run:` commands (not workflow prose like input
    // descriptions). A `pnpm install` NOT immediately followed by
    // ` --frozen-lockfile` would drop the integrity check.
    // `--frozen-lockfile=false` is fine — still the frozen-lockfile flag, and it
    // only fires under the force_install dispatch branch.
    const bare = Object.keys(jobs)
      .flatMap(runsOf)
      .filter((r) => /pnpm install(?! --frozen-lockfile)/.test(r));
    expect(bare, `found a pnpm install without --frozen-lockfile: ${JSON.stringify(bare)}`).toEqual([]);
  });

  it('the authoritative frozen-lockfile install runs in both the gate and invariants jobs', () => {
    for (const job of ['gate', 'invariants']) {
      expect(
        runsOf(job).some((r) => r.includes('pnpm install --frozen-lockfile')),
        `${job} job must run the frozen-lockfile install`
      ).toBe(true);
    }
  });

  it('the invariants job shares the gate pnpm store (same cache key)', () => {
    expect(
      usesOf('invariants').some((u) => u.startsWith('actions/cache')),
      'invariants job must cache the pnpm store so its install warms from the gate'
    ).toBe(true);
    // The same store cache key must appear for BOTH jobs → one shared store.
    const occurrences = raw.split(STORE_KEY).length - 1;
    expect(
      occurrences,
      `the shared store cache key must appear in both the gate and invariants jobs (found ${occurrences})`
    ).toBeGreaterThanOrEqual(2);
  });
});

describe('COST-212 — invariants run once; dedicated gate stays authoritative', () => {
  it('the gate job runs the invariants-excluded vitest scope, not the full suite', () => {
    expect(
      runsOf('gate').some((r) => r.includes('flags:test:gate')),
      'gate must run the invariants-excluded `flags:test:gate` scope'
    ).toBe(true);
    expect(
      runsOf('gate').some((r) => /pnpm flags:test(?!:gate)/.test(r)),
      'gate must NOT run the full `flags:test` (that would re-run invariants)'
    ).toBe(false);
  });

  it('the dedicated invariants job is the single place invariants.test.ts executes', () => {
    const invRuns = Object.keys(jobs)
      .flatMap((name) => runsOf(name))
      .filter((r) => r.includes('invariants.test.ts'));
    expect(invRuns.length, `invariants.test.ts must run exactly once across all jobs (found ${invRuns.length})`).toBe(1);
    expect(
      runsOf('invariants').some((r) => r.includes('vitest run tests/invariants.test.ts')),
      'the dedicated invariants job must be the one that runs it'
    ).toBe(true);
  });

  it('the `test:gate` script actually excludes invariants', () => {
    const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8')) as { scripts?: Record<string, string> };
    const gate = pkg.scripts?.['test:gate'] ?? '';
    expect(gate, 'test:gate must use --exclude').toMatch(/--exclude/);
    expect(gate, 'test:gate must exclude invariants').toMatch(/invariants/);
  });
});

describe('OSE-953 — hosted-runner migration topology (all jobs off self-hosted)', () => {
  // Topology intent that no behavioral test observes: these jobs must run on
  // GitHub-hosted runners, not the retired self-hosted BLOODRAVEN box. A silent
  // revert to `self-hosted` (or a new job added on it) still executes correctly
  // but would re-pin the workspace CI to a machine slated for retirement and
  // reintroduce the Windows-isms this migration removed. Assert it structurally.
  const jobsWithRunsOn = wf.jobs as Record<string, { 'runs-on'?: string; steps?: Array<{ run?: string; uses?: string }> }>;

  it('no job runs on a self-hosted runner', () => {
    const selfHosted = Object.entries(jobsWithRunsOn)
      .filter(([, j]) => String(j['runs-on'] ?? '').includes('self-hosted'))
      .map(([name]) => name);
    expect(selfHosted, `these jobs are still self-hosted: ${JSON.stringify(selfHosted)}`).toEqual([]);
  });

  it('every job runs on ubuntu-latest', () => {
    for (const [name, j] of Object.entries(jobsWithRunsOn)) {
      expect(j['runs-on'], `${name} must run on ubuntu-latest`).toBe('ubuntu-latest');
    }
  });

  it('no job invokes the Windows-only `py` launcher (ephemeral runners are ubuntu)', () => {
    const pyUsers = Object.entries(jobsWithRunsOn)
      .filter(([, j]) => (j.steps ?? []).some((s) => /(^|\s)py\s+\S+\.py/.test(s.run ?? '')))
      .map(([name]) => name);
    expect(pyUsers, `these jobs still call \`py\` instead of \`python3\`: ${JSON.stringify(pyUsers)}`).toEqual([]);
  });

  it('any job running a Python script provisions Python via actions/setup-python', () => {
    for (const [name, j] of Object.entries(jobsWithRunsOn)) {
      const steps = j.steps ?? [];
      const runsPython = steps.some((s) => /python3?\s+\S+\.py|flags:level0|test:level0/.test(s.run ?? ''));
      if (!runsPython) continue;
      expect(
        steps.some((s) => (s.uses ?? '').startsWith('actions/setup-python')),
        `${name} runs Python but does not set up Python — it would fail on the hosted runner`
      ).toBe(true);
    }
  });
});
