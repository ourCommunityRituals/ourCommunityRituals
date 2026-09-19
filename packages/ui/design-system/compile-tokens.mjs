#!/usr/bin/env node
/**
 * Compiles tokens.json -> tokens.css for the OurSharedEvents design system.
 *
 * Run from this directory:   node compile-tokens.mjs
 *
 * Emits, in order:
 *   1. the first theme's colours on bare :root (dark is the default, matching @ocr/ui)
 *   2. each further theme, under both prefers-color-scheme and [data-theme]
 *   3. spacing, radius and any other non-colour families, plus --font-<family>
 *   4. one class per type style
 *
 * A colour value of "{other-token}" is an alias and compiles to var(--other-token).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const T = JSON.parse(readFileSync(join(here, 'tokens.json'), 'utf8'));

const themes = T.color.themes.map((t) => t.id);
const first = themes[0];

const valueFor = (tok, theme) =>
  typeof tok.value === 'string' ? tok.value : (tok.value[theme] ?? tok.value[first]);

/** "{name}" is an alias to another colour token. */
const toCss = (v) => {
  const m = /^\{([A-Za-z0-9][A-Za-z0-9_.-]{0,63})\}$/.exec(String(v).trim());
  return m ? `var(--${m[1]})` : v;
};
/** A dot is legal in a token name but must be escaped in a CSS identifier. */
const esc = (n) => n.replace(/\./g, '\\.');

const out = [];

out.push(
  `/* OurSharedEvents — compiled design tokens.
 * GENERATED from tokens.json. Do not edit by hand — run: node compile-tokens.mjs
 *
 * Dark is the default theme, matching @ocr/ui: the dark roles sit on bare :root.
 * Light applies via prefers-color-scheme, or an explicit [data-theme="light"]
 * which wins over the OS preference in both directions.
 */`,
);

const decls = (theme, only) =>
  T.color.tokens
    .map((t) => [t, valueFor(t, theme)])
    .filter(([t, v]) => v && (!only || v !== valueFor(t, first)))
    .map(([t, v]) => `  --${esc(t.name)}: ${toCss(v)};`);

out.push(`:root,\n:root[data-theme="${first}"] {\n${decls(first, false).join('\n')}\n}`);

for (const th of themes.slice(1)) {
  const d = decls(th, true);
  if (!d.length) continue;
  const indented = d.map((l) => '  ' + l).join('\n');
  out.push(
    `@media (prefers-color-scheme: ${th}) {\n  :root:not([data-theme="${first}"]) {\n${indented}\n  }\n}`,
  );
  out.push(`:root[data-theme="${th}"] {\n${d.join('\n')}\n}`);
}

const structural = [];
for (const fam of ['spacing', 'radius', 'shadow']) {
  if (!T[fam]) continue;
  for (const t of T[fam].tokens) {
    const v = typeof t.value === 'object' ? valueFor(t, first) : t.value;
    structural.push(`  --${esc(t.name)}: ${v};`);
  }
}
const families = Object.keys(T.type.families ?? {});
for (const k of families) structural.push(`  --font-${k}: ${T.type.families[k]};`);
// @ocr/ui's shared stylesheet references --font directly.
if (families.length) structural.push(`  --font: var(--font-${families[0]});`);
out.push(`:root {\n${structural.join('\n')}\n}`);

const styles = [];
for (const g of T.type.groups ?? []) {
  for (const s of g.styles) {
    const d = [];
    const fam = s.family ?? g.family;
    if (fam) d.push(`  font-family: var(--font-${fam});`);
    if (s.fontSize) d.push(`  font-size: ${s.fontSize};`);
    if (s.lineHeight != null) d.push(`  line-height: ${s.lineHeight};`);
    if (s.fontWeight != null) d.push(`  font-weight: ${s.fontWeight};`);
    if (s.letterSpacing) d.push(`  letter-spacing: ${s.letterSpacing};`);
    styles.push(`.${esc(s.name)} {\n${d.join('\n')}\n}`);
  }
}
out.push(styles.join('\n\n'));

writeFileSync(join(here, 'tokens.css'), out.join('\n\n') + '\n');
console.log('tokens.css written');
