/**
 * The mutation gate for the shared packages: the per-file floor checker
 * (scripts/ci/mutation-file-floor.mjs), the Stryker configs and floors files
 * in packages/{flags,tokens,ui,team}, and .github/workflows/mutation-testing.yml.
 *
 * It lives here beside ci-workflow.test.ts, the other test of this workspace's
 * CI, because @ocr/flags' suite is the one the gate job runs on every PR.
 * Each BORN RED case was watched failing with its fault written into the
 * checker (the `<` read as `<=`, the missing-file branch removed, the ratchet's
 * `<` read as `>`, the duplicate branch removed).
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as yaml from 'js-yaml';
import { beforeAll, describe, expect, it } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const at = (p: string) => resolve(ROOT, p);
const readJson = (p: string) => JSON.parse(readFileSync(at(p), 'utf8'));

interface Floor {
  readFloors(doc: unknown): Record<string, number>;
  fileScore(mutants: { status: string }[]): number | null;
  checkFloors(report: unknown, floors: Record<string, number>): string[];
  checkRatchet(floors: Record<string, number>, base: Record<string, number>): string[];
  mergeReports(reports: unknown[]): { report: { files: Record<string, unknown> }; failures: string[] };
}
let floor: Floor;
beforeAll(async () => {
  floor = (await import(pathToFileURL(at('scripts/ci/mutation-file-floor.mjs')).href)) as Floor;
});

const m = (status: string, line = 1) => ({ status, mutatorName: 'X', location: { start: { line } } });
const report = (files: Record<string, { status: string }[]>) => ({
  files: Object.fromEntries(Object.entries(files).map(([p, mutants]) => [p, { mutants }])),
});

// The passes: each Stryker config, the floors file that judges it, and the
// script the workflow runs.
const PASSES = [
  { pkg: 'flags', config: 'stryker.conf.mjs', floors: 'mutation-floors.json', script: 'mutation:flags' },
  { pkg: 'flags', config: 'stryker.integration.conf.mjs', floors: 'mutation-floors.integration.json', script: 'mutation:flags:integration' },
  { pkg: 'tokens', config: 'stryker.conf.mjs', floors: 'mutation-floors.json', script: 'mutation:tokens' },
  { pkg: 'ui', config: 'stryker.conf.mjs', floors: 'mutation-floors.json', script: 'mutation:ui' },
  { pkg: 'team', config: 'stryker.conf.mjs', floors: 'mutation-floors.json', script: 'mutation:team' },
];

describe('fileScore', () => {
  it('scores detected over valid, the way Stryker does', () => {
    expect(floor.fileScore([m('Killed'), m('Timeout'), m('Survived'), m('NoCoverage')])).toBe(50);
    expect(floor.fileScore([m('Killed'), m('CompileError'), m('Ignored')])).toBe(100);
  });
  it('BORN RED: a file with no valid mutant has no score', () => {
    expect(floor.fileScore([m('CompileError')])).toBeNull();
  });
});

describe('checkFloors', () => {
  it('passes a file at its floor', () => {
    expect(floor.checkFloors(report({ 'src/a.ts': [m('Killed'), m('Survived')] }), { 'src/a.ts': 50 })).toEqual([]);
  });
  it('BORN RED: a file under its floor fails and names its survivors', () => {
    const f = floor.checkFloors(report({ 'src/a.ts': [m('Killed'), m('Survived', 7)] }), { 'src/a.ts': 50.01 });
    expect(f.join()).toMatch(/src\/a\.ts: 50\.00% is below its floor/);
    expect(f.join()).toMatch(/line 7/);
  });
  it('BORN RED: a floored file missing from the report, or with no valid mutant, fails', () => {
    expect(floor.checkFloors(report({}), { 'src/a.ts': 1 }).join()).toMatch(/not in the mutation report/);
    expect(floor.checkFloors(report({ 'src/a.ts': [m('CompileError')] }), { 'src/a.ts': 1 }).join()).toMatch(/no valid mutants/);
  });
});

describe('checkRatchet and mergeReports', () => {
  it('allows a floor raised or added', () => {
    expect(floor.checkRatchet({ a: 60, b: 10 }, { a: 50 })).toEqual([]);
  });
  it('BORN RED: a floor lowered or dropped fails', () => {
    expect(floor.checkRatchet({ a: 40 }, { a: 50 }).join()).toMatch(/lowered/);
    expect(floor.checkRatchet({}, { a: 50 }).join()).toMatch(/removed/);
  });
  it('BORN RED: a file in two reports is a failure, never an average', () => {
    const r = report({ 'src/a.ts': [m('Killed')] });
    expect(floor.mergeReports([r, r]).failures.join()).toMatch(/more than one mutation report/);
  });
  it('BORN RED: a floors file with no floors, or a floor outside 0 to 100, is refused', () => {
    expect(() => floor.readFloors({ floors: {} })).toThrow(/lists no files/);
    expect(() => floor.readFloors({ floors: { a: 101 } })).toThrow(/0 to 100/);
  });
});

describe('the committed passes', () => {
  for (const p of PASSES) {
    it(`${p.pkg} ${p.config}: floors every file it mutates, and nothing else`, async () => {
      const config = (await import(pathToFileURL(at(`packages/${p.pkg}/${p.config}`)).href)) as {
        default: { mutate: string[] };
      };
      const floors = floor.readFloors(readJson(`packages/${p.pkg}/${p.floors}`));
      expect(Object.keys(floors).sort()).toEqual([...config.default.mutate].sort());
      for (const file of config.default.mutate) expect(existsSync(at(`packages/${p.pkg}/${file}`)), file).toBe(true);
    });
  }

  it('no file is mutated by two passes of one package', async () => {
    const seen = new Map<string, string>();
    for (const p of PASSES) {
      const config = (await import(pathToFileURL(at(`packages/${p.pkg}/${p.config}`)).href)) as {
        default: { mutate: string[] };
      };
      for (const file of config.default.mutate) {
        const key = `${p.pkg}/${file}`;
        expect(seen.get(key), `${key} is in ${seen.get(key) ?? ''} and ${p.config}`).toBeUndefined();
        seen.set(key, p.config);
      }
    }
  });

  it('each script runs its pass and then its floors', () => {
    const scripts = (readJson('package.json') as { scripts: Record<string, string> }).scripts;
    for (const p of PASSES) {
      const s = scripts[p.script] ?? '';
      expect(s, p.script).toContain(`cd packages/${p.pkg} && stryker run`);
      if (p.config !== 'stryker.conf.mjs') expect(s, p.script).toContain(p.config);
      expect(s, p.script).toContain('scripts/ci/mutation-file-floor.mjs');
      if (p.floors !== 'mutation-floors.json') expect(s, p.script).toContain(`--floors ${p.floors}`);
    }
  });
});

describe('the workflow runs every pass', () => {
  const wf = yaml.load(readFileSync(at('.github/workflows/mutation-testing.yml'), 'utf8')) as {
    on: Record<string, unknown>;
    jobs: { mutation: { strategy: { matrix: { include: { script: string; package: string; floors: string }[] } } } };
  };
  it('has a matrix entry for each pass, with its floors file', () => {
    const include = wf.jobs.mutation.strategy.matrix.include;
    for (const p of PASSES) {
      expect(include).toContainEqual(expect.objectContaining({ script: p.script, package: p.pkg, floors: p.floors }));
    }
  });
  it('runs nightly and on demand', () => {
    expect(wf.on).toHaveProperty('schedule');
    expect(wf.on).toHaveProperty('workflow_dispatch');
  });
});
