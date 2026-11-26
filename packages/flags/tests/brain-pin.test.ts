/**
 * The OCR-docs brain is read at a pinned commit (CCR F3; owner decision
 * 2026-11-26: pilot in ourWKRP, then the hub and OSE).
 *
 * ci.yml used to check out OCR-docs at main, so a change merged there ran in
 * the hub's CI on the next PR without a review here. Now:
 *   1. .ocr-brain-ref holds one full commit id;
 *   2. every OCR-docs checkout in ci.yml fetches main with full history and is
 *      followed, before any other step, by ./.github/actions/brain-pin;
 *   3. that action passes the base branch's pin to scripts/ci/brain-pin.sh, and
 *      the script refuses a malformed pin, a pin that is not on OCR-docs main
 *      and a pin older than the base branch's, then moves the checkout to it.
 *
 * Born red: rules 1 and 2 fail on the old ci.yml; rule 3 runs the real script
 * against a throwaway OCR-docs history.
 */
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as yaml from 'js-yaml';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const SCRIPT = join(ROOT, 'scripts/ci/brain-pin.sh');
const ACTION = join(ROOT, '.github/actions/brain-pin/action.yml');
const CI = join(ROOT, '.github/workflows/ci.yml');

type Step = { name?: string; uses?: string; run?: string; with?: Record<string, unknown> };
const jobs = (yaml.load(readFileSync(CI, 'utf8')) as { jobs: Record<string, { steps?: Step[] }> }).jobs;
const brainCheckouts = Object.entries(jobs).flatMap(([job, j]) =>
  (j.steps ?? []).flatMap((s, i) => (s.with?.repository === 'ourCommunityRituals/OCR-docs' ? [{ job, i, s, steps: j.steps! }] : [])),
);

describe('the pin file and the ci.yml wiring', () => {
  it('.ocr-brain-ref is one full commit id', () => {
    expect(existsSync(join(ROOT, '.ocr-brain-ref'))).toBe(true);
    expect(readFileSync(join(ROOT, '.ocr-brain-ref'), 'utf8').trim()).toMatch(/^[0-9a-f]{40}$/);
  });

  it('ci.yml checks out the brain in the four jobs that read it', () => {
    expect(brainCheckouts.map((c) => c.job).sort()).toEqual(['brain-parity', 'gate', 'invariants', 'shared-gate-drift']);
  });

  it.each(brainCheckouts.map((c) => [c.job, c] as const))(
    '%s: fetches OCR-docs main with full history, then pins it in the very next step',
    (_job, c) => {
      expect(c.s.with?.ref).toBe('main');
      expect(c.s.with?.path).toBe('OCR-docs');
      expect(c.s.with?.['fetch-depth']).toBe(0);
      expect(c.steps[c.i + 1]?.uses).toBe('./.github/actions/brain-pin');
    },
  );

  it('the brain-pin action passes the base branch pin, so a PR cannot roll the brain back', () => {
    const run = ((yaml.load(readFileSync(ACTION, 'utf8')) as { runs: { steps: Step[] } }).runs.steps)
      .map((s) => s.run ?? '')
      .join('\n');
    expect(run).toMatch(/show FETCH_HEAD:\.ocr-brain-ref/);
    expect(run).toMatch(/scripts\/ci\/brain-pin\.sh" OCR-docs .*\.ocr-brain-ref" "\$base_pin"/);
  });
});

describe('brain-pin.sh, run for real', () => {
  let dir = '';
  let brain = '';
  const sha: Record<string, string> = {};
  const git = (...a: string[]) => spawnSync('git', ['-C', brain, ...a], { encoding: 'utf8' }).stdout.trim();
  const commit = (label: string) => {
    writeFileSync(join(brain, 'f.txt'), label);
    git('add', 'f.txt');
    git('-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', label);
    sha[label] = git('rev-parse', 'HEAD');
  };
  const run = (pin: string | null, base = '') => {
    const pinFile = join(dir, 'pin');
    if (pin === null) rmSync(pinFile, { force: true });
    else writeFileSync(pinFile, `${pin}\n`);
    git('checkout', '-q', 'main');
    return spawnSync('bash', [SCRIPT, brain, pinFile, base], { encoding: 'utf8' });
  };

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'brain-pin-'));
    brain = join(dir, 'ocr-docs');
    spawnSync('git', ['init', '-q', '-b', 'main', brain]);
    commit('A');
    commit('B');
    git('checkout', '-q', '-b', 'side');
    commit('D'); // on a branch, never merged
    git('checkout', '-q', 'main');
    commit('C');
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it('a pin on main moves the checkout there and warns how far behind it is', () => {
    const r = run(sha.B);
    expect(r.status).toBe(0);
    expect(git('rev-parse', 'HEAD')).toBe(sha.B);
    expect(r.stdout).toContain('::warning');
    expect(r.stdout).toContain('1 commit(s) behind');
  });

  it('a pin at main passes without a warning', () => {
    const r = run(sha.C, sha.B);
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain('::warning');
  });

  it.each([
    ['a missing pin file', () => run(null), 'is missing'],
    ['a short commit id', () => run(sha.B.slice(0, 7)), 'full 40-character'],
    ['a branch name', () => run('main'), 'full 40-character'],
    ['a commit that is not on main', () => run(sha.D), 'not on OCR-docs main'],
    ['a commit OCR-docs does not have', () => run('f'.repeat(40)), 'not in OCR-docs'],
    ['a pin older than the base branch pin', () => run(sha.B, sha.C), 'moves the brain back'],
  ])('refuses %s', (_label, go, message) => {
    const r = go();
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('::error');
    expect(r.stdout).toContain(message);
  });
});
