import { contrastRatio } from '../src/contrast.ts';
import { brandThemes } from '../src/tokens.ts';
import { checkBrandContrast, resolveBrandPalette, brandContrastPairs } from '../src/brand.ts';

// Every pair is DERIVED from tokens.ts: the base palette is resolved the same
// way registered brands are, and held to the same matrix (brandContrastPairs):
// each text role on every ground at 4.5:1, control edges at 3:1, ink on every
// accent/danger fill at 4.5:1. The hand-synced hex list this replaced is how a
// stale --bg let the OSE-1325 danger regression through, and how the dark
// accent-as-text (4.11:1) and muted-on-hover (4.04:1) gaps went unseen.
const extraPairs = [
  // Status-pill text on the neutral --border fill (sponsor-home .done/.declined).
  { fg: '--text', bg: '--border', min: 4.5, kind: 'text' },
];

let allPass = true;
for (const mode of ['dark', 'light']) {
  const pal = resolveBrandPalette('', mode);
  let checked = 0;
  for (const p of [...brandContrastPairs(), ...extraPairs]) {
    const ratio = contrastRatio(pal[p.fg], pal[p.bg]);
    checked++;
    if (ratio < p.min) {
      allPass = false;
      console.log(`FAIL ✗     base ${mode}: ${p.fg} on ${p.bg} = ${ratio.toFixed(2)}:1 (min ${p.min})`);
    }
  }
  console.log(`base ✓?    base palette ${mode}: ${checked} pairs checked`.replace('✓?', allPass ? '✓ ' : '✗ '));
}
// Registered brand themes ([data-brand]) — each on its OWN grounds, both modes.
// The pairs are derived from tokens.ts (not hand-synced), see src/brand.ts.
for (const name of Object.keys(brandThemes)) {
  const failures = checkBrandContrast(name);
  if (failures.length) allPass = false;
  for (const mode of ['dark', 'light']) {
    const pal = resolveBrandPalette(name, mode);
    const owned = brandThemes[name][mode];
    const rows = brandContrastPairs().filter((p) => p.fg in owned || p.bg in owned);
    const worst = rows
      .map((p) => ({ ...p, ratio: contrastRatio(pal[p.fg], pal[p.bg]) }))
      .sort((a, b) => a.ratio / a.min - b.ratio / b.min)[0];
    const bad = failures.filter((f) => f.mode === mode);
    console.log(
      `${bad.length ? 'FAIL ✗   ' : 'brand ✓  '}  [data-brand="${name}"] ${mode}: ${rows.length} pairs` +
        (worst ? `, tightest ${worst.fg} on ${worst.bg} ${worst.ratio.toFixed(2)}:1 (min ${worst.min})` : '')
    );
    for (const f of bad) console.log(`           ${f.fg} on ${f.bg} = ${f.ratio.toFixed(2)}:1 (min ${f.min})`);
  }
}
console.log('');
console.log(allPass ? '✓ All pairs meet WCAG AA (4.5:1 text, 3:1 control edges)' : '✗ Some pairs below AA — fix before shipping');
// A gate that can't fail is not a gate — exit non-zero so CI actually blocks
// on a sub-AA pair (OSE-1328).
process.exit(allPass ? 0 : 1);
