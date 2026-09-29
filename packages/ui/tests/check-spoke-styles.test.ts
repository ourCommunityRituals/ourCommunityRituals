import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
// @ts-expect-error -- plain .mjs script with no type declarations
import { run, measure, uiTokenNames, globToRegExp } from '../scripts/check-spoke-styles.mjs';

type Metrics = Record<string, number>;
const tokensSource = readFileSync(join(__dirname, '..', 'src', 'tokens.ts'), 'utf8');
const uiNames = uiTokenNames(tokensSource) as Set<string>;

function spoke(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'spoke-'));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(join(root, path, '..'), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

describe('check-spoke-styles', () => {
  it('reads the token names @ocr/ui defines', () => {
    expect(uiNames.has('--bg')).toBe(true);
    expect(uiNames.has('--border-strong')).toBe(true);
  });

  it('globs: ** spans directories, * stays in one segment', () => {
    expect(globToRegExp('src/**/*.html').test('src/templates/a.html')).toBe(true);
    expect(globToRegExp('src/**/*.html').test('src/a.html')).toBe(true);
    expect(globToRegExp('src/*.html').test('src/templates/a.html')).toBe(false);
  });

  it('a page on /ui.css with a small inline style is clean', () => {
    const m = measure('a.html', '<link rel="stylesheet" href="/ui.css"><style>.x{gap:8px}</style>', {
      uiNames,
    }) as Metrics;
    expect(m).toEqual({ 'own-tokens': 0, 'own-stylesheet': 0, 'raw-hex': 0, 'foreign-stylesheet': 0 });
  });

  it('counts a :root token layer, token redeclarations (the self-referential --bg), raw hex and foreign sheets', () => {
    const html =
      '<link rel="stylesheet" href="https://fonts.example/x.css">' +
      '<style>:root{--bg:#0a0a0a;--brand:#d4954b}' +
      "[data-surface='x']{--bg:var(--bg,#faf9f7);--local-gap:8px}" +
      '.a{color:#fff;background:var(--accent,#4361ee)}</style>';
    const m = measure('a.html', html, { uiNames, inlineStyleBudget: 10_000 }) as Metrics;
    expect(m['own-tokens']).toBe(3); // --bg, --brand in :root + --bg redeclared
    expect(m['raw-hex']).toBe(3); // #0a0a0a, #d4954b, #fff — fallbacks allowed
    expect(m['foreign-stylesheet']).toBe(1);
  });

  it('a whole .css file counts as the spoke stylesheet', () => {
    const m = measure('site.css', '.a{gap:8px}', { uiNames }) as Metrics;
    expect(m['own-stylesheet']).toBe(11);
  });

  it('fails when debt grows and passes when it shrinks', () => {
    const root = spoke({ 'src/a.html': '<style>.a{color:#fff;border-color:#000}</style>' });
    const grown = run({ root, config: { include: ['src/**/*.html'], baseline: {} }, tokensSource });
    expect(grown.regressions).toEqual([{ file: 'src/a.html', metric: 'raw-hex', was: 0, now: 2 }]);

    const baseline = { 'src/a.html': { 'raw-hex': 3 } };
    const shrunk = run({ root, config: { include: ['src/**/*.html'], baseline }, tokensSource });
    expect(shrunk.regressions).toEqual([]);
    expect(shrunk.improvements).toEqual([{ file: 'src/a.html', metric: 'raw-hex', was: 3, now: 2 }]);
  });

  it('skips vendored standards and node_modules', () => {
    const root = spoke({
      '.ocr-standards/x.html': '<style>:root{--bg:#000}</style>',
      'node_modules/y/z.css': '.a{color:#000}',
    });
    const r = run({ root, config: { include: ['**/*.html', '**/*.css'] }, tokensSource });
    expect(r.current).toEqual({});
  });
});
