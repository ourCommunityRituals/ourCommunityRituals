#!/usr/bin/env node
/**
 * The §5 gate: component CSS contains no raw hex, no raw px, no magic numbers.
 *
 *   node scripts/check-raw-values.mjs <path...>        # exit 1 on any violation
 *   node scripts/check-raw-values.mjs --report <path>  # list, always exit 0
 *
 * Scans .css files and the inline <style> blocks inside .html and .ts (the OSE
 * Worker builds pages as TS string constants, so its CSS lives in .ts).
 *
 * WHY THIS CAN BE A GREP. Because Tier 3 exists. A component stylesheet that
 * needs a value has a NAME for it — `var(--card-padding)`, not `14px`. So any
 * literal that survives is either a token that was never defined or a decision
 * made in the wrong place. That is a real defect both times.
 *
 * WHAT IS ALLOWED, and why each exemption is safe:
 *   • The token package's own dist/ and src/ — this is where values are DEFINED.
 *   • 0 with or without a unit — zero is zero in every design system.
 *   • 1px / 2px / 3px hairlines — sub-scale rendering details (borders, offsets)
 *     that a spacing scale should not own. Anything 4px or larger is a scale step.
 *   • 100%, 100vh, 1fr, and other layout-relative units — not design values.
 *   • Numbers inside var() fallbacks are still flagged; a fallback is a silent
 *     second source of truth.
 */

import { readFileSync, statSync, readdirSync } from 'node:fs';
import { join, extname, relative, sep } from 'node:path';

const args = process.argv.slice(2);
const reportOnly = args.includes('--report');
const roots = args.filter((a) => !a.startsWith('--'));

if (roots.length === 0) {
  console.error('usage: check-raw-values.mjs [--report] <path...>');
  process.exit(2);
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'archive', 'coverage', 'build']);
const SCAN_EXT = new Set(['.css', '.html', '.ts', '.js']);

/** Hairline widths a spacing scale should not own. */
const ALLOWED_PX = new Set(['0', '1', '2', '3']);

const RULES = [
  {
    id: 'raw-hex',
    re: /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/g,
    why: 'raw hex — use a semantic or component token',
  },
  {
    id: 'raw-rgb',
    re: /\brgba?\(/g,
    why: 'raw rgb()/rgba() — use a token, or color-mix() on one',
  },
  {
    id: 'raw-px',
    re: /(?<![\w-])(\d+(?:\.\d+)?)px\b/g,
    why: 'raw px — use a space, size, or component token',
    skip: (m) => ALLOWED_PX.has(m[1]),
  },
  {
    id: 'raw-rem',
    re: /(?<![\w-])(\d+(?:\.\d+)?)rem\b/g,
    why: 'raw rem — use a size or space token',
    skip: (m) => m[1] === '0',
  },
];

/**
 * Extract the CSS regions of a file.
 *   .css            the whole file
 *   .html/.ts/.js   every <style> block, PLUS every template literal that looks
 *                   like CSS
 *
 * The template-literal case is not optional. Both fleet apps build stylesheets
 * as tagged strings in TypeScript — @ocr/ui's componentStyles and the OSE
 * Worker's pages.ts — so a gate that only reads <style> tags reports those
 * files clean while they carry hundreds of raw values. A CSS-looking literal is
 * one containing a `{ prop: value; }` run.
 */
function cssRegions(text, ext) {
  if (ext === '.css') return [{ text, offset: 0 }];

  const out = [];

  const styleRe = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = styleRe.exec(text)) !== null) {
    out.push({ text: m[1], offset: m.index + m[0].indexOf(m[1]) });
  }

  if (ext === '.ts' || ext === '.js') {
    const declRun = /\{[^{}]*[a-z-]+\s*:\s*[^;{}]+;[^{}]*\}/i;
    const litRe = /`(?:[^`\\]|\\[\s\S])*`/g;
    while ((m = litRe.exec(text)) !== null) {
      const body = m[0].slice(1, -1);
      if (!declRun.test(body)) continue;
      // Skip a literal already counted as a <style> block above.
      if (out.some((r) => m.index >= r.offset && m.index < r.offset + r.text.length)) continue;
      out.push({ text: body, offset: m.index + 1 });
    }
  }

  return out;
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      yield* walk(full);
    } else if (SCAN_EXT.has(extname(e.name))) {
      yield full;
    }
  }
}

const findings = [];

for (const root of roots) {
  const files = statSync(root).isDirectory() ? walk(root) : [root];
  for (const file of files) {
    // The token package defines values; that is its job.
    if (file.includes(`${sep}packages${sep}tokens${sep}`)) continue;
    const ext = extname(file);
    const text = readFileSync(file, 'utf8');
    for (const region of cssRegions(text, ext)) {
      for (const rule of RULES) {
        rule.re.lastIndex = 0;
        let m;
        while ((m = rule.re.exec(region.text)) !== null) {
          if (rule.skip?.(m)) continue;
          findings.push({
            file: relative(process.cwd(), file),
            line: lineOf(text, region.offset + m.index),
            value: m[0],
            why: rule.why,
          });
        }
      }
    }
  }
}

for (const f of findings) {
  console.error(`${f.file}:${f.line}  ${f.value}  — ${f.why}`);
}

if (findings.length === 0) {
  console.log('✓ no raw values outside the token files');
  process.exit(0);
}

console.error(`\n${findings.length} raw value(s) outside the token files.`);
process.exit(reportOnly ? 0 : 1);
