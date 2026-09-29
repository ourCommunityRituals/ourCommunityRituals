#!/usr/bin/env node
/**
 * check-spoke-styles — every spoke's gate against carrying its own design system.
 *
 * ADR-008 makes this package the one source of tokens and styles. A spoke that
 * declares its own tokens or ships its own stylesheet forks the design again, so
 * each spoke runs this check in CI against the hub commit it is pinned to.
 *
 * It measures, per file:
 *   own-tokens         custom properties declared in a :root / html block, or any
 *                      redeclaration of a token @ocr/ui defines (e.g. --bg)
 *   own-stylesheet     characters of CSS the spoke carries itself: <style> blocks
 *                      over the inline budget, plus whole .css files
 *   raw-hex            hex colours in CSS that do not go through a token
 *                      (a var(--token, #fallback) fallback is allowed only when
 *                      --token is one @ocr/ui defines; a fallback behind an
 *                      undefined token is the colour that actually renders)
 *   foreign-stylesheet <link rel="stylesheet"> to anything other than /ui.css
 *
 * Existing debt is recorded in the spoke's baseline and may only shrink. Anything
 * new, or any count that grows, fails the build. A count that SHRINKS also fails
 * until the baseline is lowered to match, so the ratchet closes instead of leaving
 * slack that later growth can silently refill.
 *
 * The baseline itself is guarded with --base-config <file>: the spoke's CI passes
 * the base branch's .ocr-design-check.json (e.g. `git show origin/main:...`), and
 * the check fails if this change raises any baseline count, adds a file to the
 * baseline, narrows `include`, widens `exclude` or raises `inlineStyleBudget`.
 * Without it, a PR could raise its own baseline and stay green (CCR OSE-1393 H3).
 *
 * Usage (from the spoke's CI, with the hub checked out at the pinned commit):
 *   node <hub>/packages/ui/scripts/check-spoke-styles.mjs --root <spoke>
 *        [--base-config <base .ocr-design-check.json>] [--write-baseline]
 * Config: <spoke>/.ocr-design-check.json
 *   { "include": ["src/templates/**\/*.html"], "exclude": [], "inlineStyleBudget": 400,
 *     "baseline": { "<path>": { "own-tokens": 0, "own-stylesheet": 0, "raw-hex": 0, "foreign-stylesheet": 0 } } }
 *
 * No dependencies: docs-only spokes run it with plain Node.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, realpathSync } from 'node:fs';
import { join, relative, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const METRICS = ['own-tokens', 'own-stylesheet', 'raw-hex', 'foreign-stylesheet'];
const SKIP_DIRS = new Set(['node_modules', '.git', '.ocr-standards', 'dist', 'coverage', '.wrangler']);

/** Token names @ocr/ui defines, read from its source (tokens.ts) without a TS toolchain. */
export function uiTokenNames(tokensSource) {
  return new Set([...tokensSource.matchAll(/'(--[a-z0-9-]+)'\s*:/gi)].map((m) => m[1]));
}

/** Minimal glob: `**` spans directories, `*` stays within one segment. */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*' && glob[i + 1] === '*') {
      re += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += glob[i + 2] === '/' ? 2 : 1;
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

function walk(dir, root, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, root, out);
    else out.push(relative(root, full).split(sep).join('/'));
  }
  return out;
}

/** All CSS a file carries: <style> bodies, style="" attributes, or the whole file if it is .css. */
function cssOf(path, text) {
  if (path.endsWith('.css')) return { blocks: [text], attrs: [] };
  const blocks = [...text.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
  const attrs = [...text.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map((m) => m[1]);
  return { blocks, attrs };
}

function countOwnTokens(css, uiNames) {
  let n = 0;
  // Declarations inside :root / html blocks: a spoke's own token layer.
  for (const m of css.matchAll(/(?:^|[}\s,])(?::root|html)(?:\[[^\]]*\])?\s*\{([^{}]*)\}/g)) {
    n += [...m[1].matchAll(/(--[a-z0-9-]+)\s*:/gi)].length;
  }
  // Redeclaring an @ocr/ui token anywhere else (e.g. [data-surface] { --bg: … }).
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/(?:^|[\s,}]):root\b|(?:^|[\s,}])html\b/.test(m[1])) continue;
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:/gi)) if (uiNames.has(d[1])) n++;
  }
  return n;
}

function countRawHex(css, uiNames) {
  // Only a fallback behind a token @ocr/ui defines is exempt: behind an
  // undefined token the fallback is simply the colour that renders.
  const withoutFallbacks = css.replace(
    /var\(\s*(--[a-z0-9-]+)\s*,[^()]*(?:\([^()]*\)[^()]*)*\)/gi,
    (m, name) => (uiNames.has(name) ? 'var()' : m),
  );
  return [...withoutFallbacks.matchAll(/#[0-9a-f]{3,8}\b/gi)].length;
}

export function measure(path, text, { uiNames, inlineStyleBudget = 400 }) {
  const { blocks, attrs } = cssOf(path, text);
  const all = blocks.join('\n') + '\n' + attrs.join(';');
  const blockChars = blocks.reduce((sum, b) => sum + b.trim().length, 0);
  const ownStylesheet = path.endsWith('.css') ? blockChars : Math.max(0, blockChars - inlineStyleBudget);
  const foreign = [...text.matchAll(/<link\b[^>]*rel\s*=\s*["']?stylesheet[^>]*>/gi)].filter(
    (m) => !/href\s*=\s*["']?\/ui\.css\b/i.test(m[0])
  ).length;
  return {
    'own-tokens': countOwnTokens(all, uiNames),
    'own-stylesheet': ownStylesheet,
    'raw-hex': countRawHex(all, uiNames),
    'foreign-stylesheet': foreign,
  };
}

/** Compare current measurements against the baseline. Returns regressions and improvements. */
export function compare(current, baseline) {
  const regressions = [];
  const improvements = [];
  const files = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const file of [...files].sort()) {
    for (const metric of METRICS) {
      const now = current[file]?.[metric] ?? 0;
      const was = baseline[file]?.[metric] ?? 0;
      if (now > was) regressions.push({ file, metric, was, now });
      else if (now < was) improvements.push({ file, metric, was, now });
    }
  }
  return { regressions, improvements };
}

/**
 * Guard the baseline file itself: compare this change's config against the base
 * branch's. Returns one entry per way the change loosened the gate.
 */
export function compareConfigs(base, head) {
  const violations = [];
  const baseBaseline = base.baseline ?? {};
  const headBaseline = head.baseline ?? {};
  for (const file of Object.keys(headBaseline).sort()) {
    for (const metric of METRICS) {
      const now = headBaseline[file]?.[metric] ?? 0;
      const was = baseBaseline[file]?.[metric] ?? 0;
      if (now > was) violations.push(`baseline ${file} ${metric}: ${was} -> ${now}`);
    }
  }
  const baseInclude = base.include ?? ['**/*.html', '**/*.css'];
  const headInclude = head.include ?? ['**/*.html', '**/*.css'];
  for (const g of baseInclude) if (!headInclude.includes(g)) violations.push(`include narrowed: removed "${g}"`);
  const baseExclude = base.exclude ?? [];
  for (const g of head.exclude ?? []) if (!baseExclude.includes(g)) violations.push(`exclude widened: added "${g}"`);
  const baseBudget = base.inlineStyleBudget ?? 400;
  const headBudget = head.inlineStyleBudget ?? 400;
  if (headBudget > baseBudget) violations.push(`inlineStyleBudget raised: ${baseBudget} -> ${headBudget}`);
  return violations;
}

export function run({ root, config, tokensSource }) {
  const uiNames = uiTokenNames(tokensSource);
  const include = (config.include ?? ['**/*.html', '**/*.css']).map(globToRegExp);
  const exclude = (config.exclude ?? []).map(globToRegExp);
  const current = {};
  for (const file of walk(root, root)) {
    if (!include.some((r) => r.test(file)) || exclude.some((r) => r.test(file))) continue;
    const m = measure(file, readFileSync(join(root, file), 'utf8'), {
      uiNames,
      inlineStyleBudget: config.inlineStyleBudget ?? 400,
    });
    if (METRICS.some((k) => m[k] > 0)) current[file] = m;
  }
  return { current, ...compare(current, config.baseline ?? {}) };
}

function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const root = arg('--root') ?? process.cwd();
  const configPath = join(root, '.ocr-design-check.json');
  if (!existsSync(configPath)) {
    console.error(`[design-check] missing ${configPath}`);
    return 2;
  }
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const here = dirname(fileURLToPath(import.meta.url));
  const tokensSource = readFileSync(join(here, '..', 'src', 'tokens.ts'), 'utf8');
  const { current, regressions, improvements } = run({ root, config, tokensSource });

  const baseConfigPath = arg('--base-config');
  if (baseConfigPath) {
    const base = JSON.parse(readFileSync(baseConfigPath, 'utf8'));
    const violations = compareConfigs(base, config);
    if (violations.length) {
      console.error('[design-check] .ocr-design-check.json loosens the gate relative to the base branch. The baseline may only shrink:');
      for (const v of violations) console.error(`  ${v}`);
      return 1;
    }
  }

  if (argv.includes('--write-baseline')) {
    config.baseline = current;
    writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
    console.log(`[design-check] baseline written for ${Object.keys(current).length} file(s)`);
    return 0;
  }
  if (regressions.length) {
    console.error('[design-check] This spoke is growing its own design system. Use @ocr/ui tokens and /ui.css instead.');
    for (const r of regressions) console.error(`  ${r.file}  ${r.metric}: ${r.was} -> ${r.now}`);
    return 1;
  }
  if (improvements.length) {
    console.error('[design-check] Debt shrank — lower the baseline in .ocr-design-check.json to lock it in (the ratchet only closes):');
    for (const r of improvements) console.error(`  ${r.file}  ${r.metric}: ${r.was} -> ${r.now}`);
    return 1;
  }
  console.log(`[design-check] OK — ${Object.keys(current).length} file(s) carry recorded debt, none grew.`);
  return 0;
}

// Run when invoked as a script. Compare real paths: a symlinked checkout (as in
// local staging) must not make the gate silently skip itself.
const invoked = process.argv[1] ? realpathSync(process.argv[1]) : '';
if (invoked === realpathSync(fileURLToPath(import.meta.url))) {
  process.exit(main(process.argv.slice(2)));
}
