#!/usr/bin/env node
/**
 * bundle-divergence — compare design-system/components/bundle.js against src/react/*.
 *
 * WHY THIS EXISTS
 * The bundle was produced by an external handoff tool, not by this repo: there is no
 * build script that emits it, so it cannot be regenerated or verified by rebuilding.
 * One divergence was found by eye (AccessDenied's default copy) purely because it was
 * readable prose. A changed class name, a dropped aria-* or a different default would
 * not have surfaced the same way — so "we found one" was never evidence of "there is one".
 *
 * WHAT IT COMPARES
 * Literal sets, not rendered output. Rendering would need react-dom plus invented props
 * for every component; literals are prop-independent and are exactly the surface that
 * drifts silently:
 *
 *   - className string literals       (a renamed class breaks styling with no error)
 *   - aria-* / role attribute names   (a dropped one breaks assistive tech, silently)
 *   - default parameter values        (the AccessDenied class of bug)
 *   - quoted user-visible text        (copy drift between products)
 *
 * Exit 1 on any divergence. Bundle-only components (intentional additions that have no
 * src counterpart) are reported separately and are not failures.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../src/react');
const BUNDLE = resolve(here, '../design-system/components/bundle.js');

/** Components that exist only in the bundle, by design. */
const BUNDLE_ONLY = new Set(['MapDetail', 'VoteTap']);

/**
 * The 13 the design system actually declares as its component library. Everything else
 * the bundle defines is the handoff's demo-kit layer (screens and helpers) — reported
 * separately, because "27 undeclared functions" is one finding about the artifact, not
 * 27 findings about components.
 */
const DECLARED = new Set(['Button', 'Card', 'Header', 'BottomNav', 'FormInput', 'Textarea',
  'FormSelect', 'Checkbox', 'RadioGroup', 'FormGroup', 'Loading', 'EmptyState', 'AccessDenied']);

const bundle = readFileSync(BUNDLE, 'utf8');

/** Slice `function Name(...) { ... }` out of a source blob, brace-balanced. */
function fnBody(src, name) {
  const start = src.search(new RegExp(`function\\s+${name}\\s*\\(`));
  if (start === -1) return null;
  let i = src.indexOf('{', start);
  if (i === -1) return null;
  let depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return src.slice(start, j + 1);
    }
  }
  return null;
}

const uniq = (a) => [...new Set(a)].sort();
const classNames = (s) =>
  uniq([
    ...[...s.matchAll(/className[:=]\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]),
    ...[...s.matchAll(/["'`]([a-z][a-z0-9-]*(?:\s+[a-z][a-z0-9-]*)*)["'`]\s*\+/g)].map((m) => m[1]),
  ].flatMap((v) => v.split(/\s+/)).filter((v) => /^[a-z][a-z0-9-]*$/.test(v) && v.length > 2));
const ariaAttrs = (s) => uniq([...s.matchAll(/["']?(aria-[a-z]+|role)["']?\s*[:=]/g)].map((m) => m[1]));
const defaults = (s) => uniq([...s.matchAll(/(\w+)\s*=\s*(['"])([^'"]*)\2/g)].map((m) => `${m[1]}=${m[3]}`));
const prose = (s) =>
  uniq([...s.matchAll(/(['"])([^'"\n]{12,}?)\1/g)].map((m) => m[2])
    // user-visible copy only: has a space, starts with a capital or a glyph, and is not
    // code punctuation swept up by a greedy quote match (a destructuring list, an arrow).
    .filter((t) => /\s/.test(t) && !t.includes('=>') && !/[{}();]/.test(t) && /^[A-Z\u{1F300}-\u{1FAFF}\u2190-\u27BF]/u.test(t)));

const files = readdirSync(SRC).filter((f) => /\.tsx$/.test(f));
const srcByComponent = new Map();
for (const f of files) {
  const text = readFileSync(join(SRC, f), 'utf8');
  for (const m of text.matchAll(/export\s+function\s+(\w+)/g)) {
    srcByComponent.set(m[1], fnBody(text, m[1]) ?? text);
  }
}

const rows = [];
let divergent = 0;
const bundleNames = [...bundle.matchAll(/^function\s+(\w+)\s*\(/gm)].map((m) => m[1]);

const undeclared = uniq(bundleNames).filter((n) => !DECLARED.has(n) && !BUNDLE_ONLY.has(n));

for (const name of uniq(bundleNames)) {
  if (BUNDLE_ONLY.has(name) || !DECLARED.has(name)) continue;
  const srcBody = srcByComponent.get(name);
  const bunBody = fnBody(bundle, name);
  if (!srcBody) { rows.push({ name, kind: 'NO SRC COUNTERPART', detail: ['not exported from src/react'] }); divergent++; continue; }
  if (!bunBody) continue;

  const detail = [];
  for (const [label, fn] of [['class', classNames], ['aria', ariaAttrs], ['default', defaults], ['text', prose]]) {
    const a = fn(srcBody), b = fn(bunBody);
    const onlySrc = a.filter((v) => !b.includes(v));
    const onlyBundle = b.filter((v) => !a.includes(v));
    for (const v of onlySrc) detail.push(`${label}: src only      ${JSON.stringify(v)}`);
    for (const v of onlyBundle) detail.push(`${label}: bundle only   ${JSON.stringify(v)}`);
  }
  if (detail.length) { rows.push({ name, kind: 'DIVERGENT', detail }); divergent++; }
  else rows.push({ name, kind: 'match', detail: [] });
}

console.log('bundle-divergence — design-system/components/bundle.js vs src/react/*\n');
for (const r of rows) {
  if (r.kind === 'match') { console.log(`  ✓ ${r.name}`); continue; }
  console.log(`\n  ✗ ${r.name} — ${r.kind}`);
  for (const d of r.detail) console.log(`      ${d}`);
}
const only = uniq(bundleNames).filter((n) => BUNDLE_ONLY.has(n));
if (only.length) console.log(`\n  bundle-only by design (not a divergence): ${only.join(', ')}`);

console.log(`\n${divergent} of ${rows.length} declared components diverge from src.`);
if (undeclared.length) {
  console.log(`\nUNDECLARED — the bundle also defines ${undeclared.length} functions the design`);
  console.log('system never declares. These are the handoff demo kit (screens + helpers), not');
  console.log('a component library, and they have no src counterpart to verify against:');
  console.log(`  ${undeclared.join(', ')}`);
}
// ── baseline mode ────────────────────────────────────────────────────────────
// The bundle cannot be rebuilt from this repo, so today's drift cannot be fixed by
// regenerating — only by replacing the artifact. Until then the known drift is pinned
// in a committed baseline and CI fails on anything NEW. Same contract as the repo's
// other residual lists: it must only ever shrink.
const BASELINE = resolve(here, 'bundle-divergence.baseline.json');
const current = {
  divergent: Object.fromEntries(rows.filter((r) => r.kind !== 'match').map((r) => [r.name, r.detail])),
  undeclared,
};

if (process.argv.includes('--write-baseline')) {
  writeFileSync(BASELINE, JSON.stringify(current, null, 2) + '\n');
  console.log(`\nbaseline written: ${Object.keys(current.divergent).length} divergent, ${undeclared.length} undeclared`);
  process.exit(0);
}

if (process.argv.includes('--check')) {
  if (!existsSync(BASELINE)) {
    console.error('\nNo baseline. Run: node scripts/bundle-divergence.mjs --write-baseline');
    process.exit(1);
  }
  const base = JSON.parse(readFileSync(BASELINE, 'utf8'));
  const newDivergent = Object.keys(current.divergent).filter((n) => !(n in base.divergent));
  const newUndeclared = undeclared.filter((n) => !base.undeclared.includes(n));
  const fixedDivergent = Object.keys(base.divergent).filter((n) => !(n in current.divergent));
  const fixedUndeclared = base.undeclared.filter((n) => !undeclared.includes(n));

  if (fixedDivergent.length || fixedUndeclared.length) {
    console.log(`\nSHRUNK — update the baseline: ${[...fixedDivergent, ...fixedUndeclared].join(', ')}`);
    console.log('  node scripts/bundle-divergence.mjs --write-baseline');
    process.exit(1);
  }
  if (newDivergent.length || newUndeclared.length) {
    console.error('\nNEW DRIFT between bundle.js and src/react — not in the baseline:');
    for (const n of newDivergent) console.error(`  divergent: ${n}`);
    for (const n of newUndeclared) console.error(`  undeclared: ${n}`);
    console.error('\nThe bundle is an external artifact with no build script here, so this can only');
    console.error('be resolved by replacing it — never by widening the baseline.');
    process.exit(1);
  }
  console.log('\ncheck OK — no drift beyond the committed baseline.');
  process.exit(0);
}

process.exit(divergent || undeclared.length ? 1 : 0);
