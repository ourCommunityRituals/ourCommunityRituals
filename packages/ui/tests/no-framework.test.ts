import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * @ocr/ui ships no framework. This keeps it that way.
 *
 * A React layer lived here from PR #14 until 2026-09-19. It was removed because it had
 * zero consumers, `react-dom` was never installed so nothing could render it, and its 23
 * tests asserted `typeof X === 'function'` — deferring behaviour to a Playwright spec that
 * has no runner and has never executed. Net behavioural coverage: nil, presented as a
 * tested component library.
 *
 * The FE is native JS. `partials.ts` renders the same components as HTML strings and has
 * 32 tests asserting the actual output, including XSS escaping, because a string needs no
 * renderer, no DOM and no browser to assert.
 *
 * This suite exists so the decision is enforced rather than remembered. Reintroducing a
 * framework is a real architectural choice that belongs in an ADR and a brain invariant —
 * not something that arrives as a transitive dependency or a convenient import.
 */

const PKG = resolve(__dirname, '..');
const FRAMEWORKS = ['react', 'react-dom', 'preact', 'vue', 'svelte', 'solid-js', 'lit'];

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((e) => {
    const p = join(dir, e);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

describe('no framework in @ocr/ui', () => {
  const pkg = JSON.parse(readFileSync(resolve(PKG, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
    exports?: Record<string, string>;
  };

  for (const field of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
    it(`package.json ${field} declares no UI framework`, () => {
      const declared = Object.keys(pkg[field] ?? {}).filter((d) =>
        FRAMEWORKS.includes(d) || d.startsWith('@types/react'),
      );
      expect(
        declared,
        `Adding a framework to @ocr/ui is an architectural decision, not a dependency bump. ` +
          `It needs an ADR and a brain invariant first — see docs/decisions/ADR-native-js-no-framework.md.`,
      ).toEqual([]);
    });
  }

  it('exposes no framework subpath', () => {
    expect(Object.keys(pkg.exports ?? {})).not.toContain('./react');
  });

  it('src/ contains no JSX and imports no framework', () => {
    const offenders: string[] = [];
    for (const file of walk(resolve(PKG, 'src'))) {
      if (/\.(tsx|jsx)$/.test(file)) { offenders.push(`${file} — JSX file`); continue; }
      if (!/\.ts$/.test(file)) continue;
      const text = readFileSync(file, 'utf8');
      for (const fw of FRAMEWORKS) {
        if (new RegExp(`from ['"]${fw}['"]|require\\(['"]${fw}['"]\\)`).test(text)) {
          offenders.push(`${file} — imports ${fw}`);
        }
      }
    }
    expect(offenders, `src/ must stay native:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('the design system ships no framework bundle and declares no libraries', () => {
    const bundle = resolve(PKG, 'design-system/components/bundle.js');
    expect(
      existsSync(bundle),
      'design-system/components/bundle.js was a prebuilt React artifact with no build script ' +
        'in this repo. Previews are generated from partials.ts instead.',
    ).toBe(false);

    const index = JSON.parse(
      readFileSync(resolve(PKG, 'design-system/design-system.json'), 'utf8'),
    ) as { libraries?: unknown[] };
    expect(index.libraries ?? [], 'the design system loads no runtime libraries').toEqual([]);
  });

  it('no preview mounts a framework', () => {
    const dir = resolve(PKG, 'design-system/components');
    const offenders = walk(dir)
      .filter((f) => f.endsWith('preview.html'))
      .filter((f) => /React\.createElement|ReactDOM|createRoot\(/.test(readFileSync(f, 'utf8')));
    expect(
      offenders,
      `Previews are static HTML from partials.ts — the product's own renderer:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
