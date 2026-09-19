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
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';
import { describe, it, expect } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CI_PATH = resolve(__dirname, '../../../.github/workflows/ci.yml');
const PKG_PATH = resolve(__dirname, '../package.json');

const raw = readFileSync(CI_PATH, 'utf8');
const wf = yaml.load(raw) as {
  permissions?: Record<string, string>;
  jobs?: Record<string, { steps?: Array<{ run?: string; uses?: string; with?: Record<string, unknown> }> }>;
};
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

describe('OSE-1045 — CI credential hygiene (no org-write token left for install scripts)', () => {
  // Reactive correction. The hardened pattern from the OCR_PROPAGATE_TOKEN
  // review (token must not outlive the clone that needs it) was applied on the
  // OSE surface and never propagated to this workspace: every OCR-docs checkout
  // here carried an org-write token with `persist-credentials` left at its
  // default of TRUE, writing the credential into OCR-docs/.git/config — where
  // the `pnpm install` that runs later in the same job exposes it to every
  // dependency lifecycle script. Nothing was shaped to go red. This is that
  // object.
  const checkoutSteps = Object.entries(jobs).flatMap(([job, def]) =>
    (def.steps ?? [])
      .filter((s) => (s.uses ?? '').startsWith('actions/checkout@'))
      .map((s) => ({ job, with: (s.with ?? {}) as Record<string, unknown> })),
  );

  it('the workflow actually has checkout steps to assert on', () => {
    expect(checkoutSteps.length, 'no actions/checkout steps parsed — the guard would vacuously pass').toBeGreaterThan(0);
  });

  it('every checkout sets persist-credentials: false', () => {
    const leaky = checkoutSteps
      .filter((s) => s.with['persist-credentials'] !== false)
      .map((s) => s.job);
    expect(leaky, `these jobs persist checkout credentials into .git/config: ${JSON.stringify(leaky)}`).toEqual([]);
  });

  it('no token-bearing checkout persists its credential', () => {
    const tokened = checkoutSteps.filter((s) => typeof s.with['token'] === 'string');
    expect(tokened.length, 'expected at least one explicitly-tokened checkout (the OCR-docs brain)').toBeGreaterThan(0);
    for (const s of tokened) {
      expect(
        s.with['persist-credentials'],
        `${s.job}: a checkout carrying an explicit token MUST set persist-credentials: false`,
      ).toBe(false);
    }
  });

  it('the workflow declares an explicit least-privilege permissions block', () => {
    expect(wf.permissions, 'ci.yml must not inherit the repo-default GITHUB_TOKEN scope').toBeDefined();
    expect(wf.permissions?.contents, 'contents must be read-only — no job here writes to the repo').toBe('read');
  });
});

describe('L1 lint — the base static-quality tier exists and executes', () => {
  // The tier was specified in docs/cost-sustainability/BACKLOG.md but did not
  // exist: no eslint config in any form, no workflow invoking lint, and eslint
  // not even a declared dependency. It was never red and never green — absent,
  // and absence is invisible from every tier above it. These assertions are the
  // object whose job is to go red if it disappears again.
  it('a lint step runs in the gate job', () => {
    const lintSteps = runsOf('gate').filter((r) => /\blint\b/.test(r));
    expect(lintSteps.length, 'the gate job must invoke lint — L1 is the base tier').toBeGreaterThan(0);
  });

  it('the root package exposes the lint script the gate calls', () => {
    const root = JSON.parse(readFileSync(resolve(__dirname, '../../../package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    expect(root.scripts?.lint, 'root `lint` script must exist').toBeDefined();
    expect(root.devDependencies?.eslint, 'eslint must be a DECLARED dependency — otherwise the version resolved is whatever npx happens to fetch').toBeDefined();
  });

  it('an eslint flat config exists at the workspace root', () => {
    const cfg = resolve(__dirname, '../../../eslint.config.js');
    expect(existsSync(cfg), 'eslint.config.js must exist — without it eslint exits on a config error before reading a single file').toBe(true);
  });
});

/**
 * THE ABSENT-TIER ANTIBODY — generalised.
 *
 * This repo has met the same failure three times and fixed it three times in
 * isolation:
 *
 *   1. L1 lint  — "never red and never green; it was absent" (eslint.config.js header)
 *   2. COST-201 — a sibling-directory probe that `exit 0`'d when the brain was
 *                 missing, so brain-parity passed without running (ci.yml comments)
 *   3. @ocr/ui  — five suites, ~130 assertions, and NO `ui:*` script existed for CI
 *                 to call, so no workflow ever invoked them
 *
 * Each fix locked its own instance. None of them stopped the fourth. The shape is
 * always the same: a package declares real checks, nothing calls them, and the gap
 * is invisible from every tier above — a passing CI is indistinguishable from a CI
 * that never ran the thing.
 *
 * So this suite asserts the RULE rather than the instances: every workspace package
 * that declares a `test` script must be reachable from the gate. Adding a package
 * with tests and forgetting to wire it now fails here, at the moment it is added,
 * instead of years later during a recon.
 *
 * Deliberately NOT asserted: that a package HAS tests. That is a coverage argument
 * and belongs elsewhere. This asserts only that declared checks are actually run —
 * the difference between an absent tier and a thin one.
 */
describe('absent-tier antibody — declared checks must be invoked by CI', () => {
  const ROOT = resolve(__dirname, '../../..');
  const rootPkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
    scripts?: Record<string, string>;
  };
  const rootScripts = rootPkg.scripts ?? {};

  /**
   * Named residuals — NOT a bypass, and this list must only ever SHRINK.
   * Same convention as eslint.config.js's residual-TS list: the honest statement
   * of what is not covered, kept visible instead of silently excluded.
   */
  const NAMED_RESIDUALS: Record<string, string> = {
    '@ocr/data-provider':
      'Declares a `test` script but ships ZERO test files, so `vitest run` exits 1 on an ' +
      'empty run. Wiring it would add a permanently-red gate. This is the same disease one ' +
      'step earlier — a declared check with nothing behind it. Fix by adding tests or by ' +
      'removing the phantom script; do not fix by widening this list.',
  };

  /** Every workspace package that declares the given script. */
  const packagesDeclaring = (script: string): { dir: string; name: string }[] => {
    const out: { dir: string; name: string }[] = [];
    for (const dir of readdirSync(resolve(ROOT, 'packages'))) {
      const pkgPath = resolve(ROOT, 'packages', dir, 'package.json');
      if (!existsSync(pkgPath)) continue;
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        name?: string;
        scripts?: Record<string, string>;
      };
      const name = pkg.name ?? dir;
      if (pkg.scripts?.[script] && !(name in NAMED_RESIDUALS)) out.push({ dir, name });
    }
    return out;
  };

  /**
   * Every command CI can actually execute, with root scripts expanded one level and the
   * step's `working-directory` carried along.
   *
   * The first version of this matched the package NAME anywhere in the surface, which was
   * itself a false green: removing the `pnpm ui:test` step still left `pnpm ui:check:generated`
   * mentioning @ocr/ui, so the rule passed while the tests had gone dark. Verified by
   * deleting the step and watching this suite stay green — exactly the failure it exists to
   * catch, committed by the check itself. Match the SCRIPT, never the package.
   */
  const gateCommands = (): { cmd: string; cwd: string }[] => {
    const out: { cmd: string; cwd: string }[] = [];
    for (const job of Object.values(jobs)) {
      for (const step of job.steps ?? []) {
        const run = step.run ?? '';
        if (!run) continue;
        const cwd = (step as { 'working-directory'?: string })['working-directory'] ?? '';
        const m = /pnpm\s+([A-Za-z0-9:_-]+)/.exec(run);
        const key = m?.[1];
        const expanded = key ? rootScripts[key] : undefined;
        out.push({ cmd: expanded ? `${run}\n${expanded}` : run, cwd });
      }
    }
    return out;
  };

  /** True only if some CI step invokes THIS script for THIS package. */
  const reaches = (pkgName: string, dir: string, script: string): boolean =>
    gateCommands().some(({ cmd, cwd }) => {
      // `pnpm --filter @ocr/x <script>` — the root-script convention
      if (new RegExp(`--filter\\s+${pkgName.replace('/', '\\/')}\\s+${script}\\b`).test(cmd)) return true;
      // or a step that cd's into the package and runs it directly
      if (cwd === `packages/${dir}` && new RegExp(`\\b${script}\\b`).test(cmd)) return true;
      return false;
    });

  it('every package declaring a `test` script is invoked by some CI job', () => {
    const orphans = packagesDeclaring('test')
      .filter((p) => !reaches(p.name, p.dir, 'test'))
      .map((p) => `${p.name} (packages/${p.dir}) declares \`test\` and no CI job runs it`);
    expect(
      orphans,
      `A package's tests are worth nothing if no job calls them — that is the absent tier,
and it is invisible from every layer above. Add a root script (e.g. "<pkg>:test":
"pnpm --filter <name> test") and a step in the gate job.
Orphans:\n  ${orphans.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('every package declaring a `check:generated` script is invoked by some CI job', () => {
    const orphans = packagesDeclaring('check:generated')
      .filter((p) => !reaches(p.name, p.dir, 'check:generated'))
      .map((p) => `${p.name} (packages/${p.dir}) declares \`check:generated\` and no CI job runs it`);
    expect(
      orphans,
      `A committed generator with committed output and no drift gate diverges silently
the first time someone hand-edits the output.
Orphans:\n  ${orphans.join('\n  ')}\n`,
    ).toEqual([]);
  });

  it('@ocr/ui specifically is wired — it was the third recurrence', () => {
    expect(reaches('@ocr/ui', 'ui', 'test'), '@ocr/ui tests must be invoked by CI').toBe(true);
    expect(rootScripts['ui:test'], 'root `ui:test` must exist — CI calls root scripts').toBeDefined();
  });
});

describe('named residuals stay honest', () => {
  it('every named residual still exists and still declares the script it is excused from', () => {
    const ROOT = resolve(__dirname, '../../..');
    for (const name of Object.keys({ '@ocr/data-provider': 1 })) {
      const dir = name.replace('@ocr/', '');
      const pkgPath = resolve(ROOT, 'packages', dir, 'package.json');
      expect(
        existsSync(pkgPath),
        `${name} is excused in NAMED_RESIDUALS but no longer exists — remove the entry`,
      ).toBe(true);
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> };
      expect(
        pkg.scripts?.test,
        `${name} no longer declares a \`test\` script — remove it from NAMED_RESIDUALS and let the rule apply`,
      ).toBeDefined();
    }
  });
});
