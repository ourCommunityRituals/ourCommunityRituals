#!/usr/bin/env node
/**
 * stylesheet-coverage — design-system/components/bundle.css vs src/styles.ts.
 *
 * REPLACES scripts/bundle-divergence.mjs, which compared the design system's React
 * bundle against src/react. Both sides of that comparison are gone: there is no React
 * layer, and the FE is native JS. Verifying a framework artifact against a framework
 * layer was measuring the wrong thing even while it passed.
 *
 * What actually matters now is the STYLESHEET, because `partials.ts` emits nothing but
 * class names — zero inline styles, zero literal hex. The stylesheet IS the design
 * system as far as rendered output is concerned, and the real risk is that the design
 * system's copy of it drifts from the one the product serves.
 *
 * It already has: bundle.css carries 122 classes against styles.ts's 134. The 34 it
 * lacks are almost all ourWKRP surfaces (.genre-link*, .genre-popup*, .contributor-*,
 * .grid-*, .track-grid, .progress-*, .preview-table*, .result-*). Adopting bundle.css
 * in place of styles.ts would silently delete a third of OW's rendered surfaces —
 * which is exactly the kind of thing @ocr/ui being a shared cross-product package
 * (invariant #22) makes dangerous.
 *
 * Baseline-gated: fails on NEW drift and on FIXED drift, so the gap shrinks rather
 * than rots.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const BASELINE = resolve(here, 'stylesheet-coverage.baseline.json');

/** Class selectors declared by a stylesheet, comments stripped, at-rules descended. */
function classesIn(source) {
  const css = source.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = new Set();
  for (const m of css.matchAll(/(^|[\s,}{])\.([a-zA-Z][\w-]*)/g)) out.add(m[2]);
  return [...out].sort();
}

const stylesTs = readFileSync(resolve(here, '../src/styles.ts'), 'utf8');
const bundleCss = readFileSync(resolve(here, '../design-system/components/bundle.css'), 'utf8');

const inStyles = classesIn(stylesTs);
const inBundle = classesIn(bundleCss);
const missingFromBundle = inStyles.filter((c) => !inBundle.includes(c));
const bundleOnly = inBundle.filter((c) => !inStyles.includes(c));

const current = { missingFromBundle, bundleOnly };

if (process.argv.includes('--write-baseline')) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(`baseline written: ${missingFromBundle.length} missing, ${bundleOnly.length} design-system-only`);
  process.exit(0);
}

console.log('stylesheet-coverage — design-system/components/bundle.css vs src/styles.ts\n');
console.log(`  src/styles.ts      ${inStyles.length} classes  (what the product serves)`);
console.log(`  bundle.css         ${inBundle.length} classes  (the design system's copy)`);
console.log(`  missing from bundle ${missingFromBundle.length}`);
console.log(`  design-system only  ${bundleOnly.length}`);

if (process.argv.includes('--check')) {
  if (!existsSync(BASELINE)) {
    console.error('\nNo baseline. Run: node scripts/stylesheet-coverage.mjs --write-baseline');
    process.exit(1);
  }
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const newMissing = missingFromBundle.filter((c) => !base.missingFromBundle.includes(c));
  const newOnly = bundleOnly.filter((c) => !base.bundleOnly.includes(c));
  const fixed = base.missingFromBundle.filter((c) => !missingFromBundle.includes(c));

  if (fixed.length) {
    console.log(`\nSHRUNK — update the baseline: ${fixed.join(', ')}`);
    console.log('  node scripts/stylesheet-coverage.mjs --write-baseline');
    process.exit(1);
  }
  if (newMissing.length || newOnly.length) {
    console.error('\nNEW stylesheet drift, not in the baseline:');
    for (const c of newMissing) console.error(`  missing from bundle.css: .${c}`);
    for (const c of newOnly) console.error(`  design-system only:      .${c}`);
    console.error('\nsrc/styles.ts is what the product serves. A class it has and the design');
    console.error('system lacks is a surface the design system would delete on adoption.');
    process.exit(1);
  }
  console.log('\ncheck OK — no drift beyond the committed baseline.');
  process.exit(0);
}

console.log(`\n  missing: ${missingFromBundle.join(', ') || '(none)'}`);
process.exit(missingFromBundle.length || bundleOnly.length ? 1 : 0);
