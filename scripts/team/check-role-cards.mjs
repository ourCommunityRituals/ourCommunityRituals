#!/usr/bin/env node
// Checks the agent team's role cards (team/roles/*.md).
//
// A role card is the short, pre-read slice of the corpus one agent needs. Its
// front matter lists each source file with a sha256 prefix, so a card can be
// shown stale when a source changes:
//
//   sources:
//     - ourSharedEvents:AGENTS.md sha256:98994422013c
//
// Always checked: the front matter shape and the size limit (4096 bytes).
// Checked when the source's repo sits in --workspace: the hash. A source whose
// repo is absent is "unchecked"; with --strict, that is a failure too.
//
// Usage: node scripts/team/check-role-cards.mjs [--workspace DIR] [--strict] [--cards DIR]
// Exit 0 = all good, 1 = a card failed.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAX_CARD_BYTES = 4096;
const HASH_LEN = 12;
const SOURCE_RE = /^ {2}- ([A-Za-z0-9_.-]+):(\S+) sha256:([0-9a-f]{12})$/;

export function sha12(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, HASH_LEN);
}

export function parseCard(text) {
  const errors = [];
  if (!text.startsWith('---\n')) return { errors: ['no front matter'], sources: [] };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { errors: ['front matter not closed'], sources: [] };
  const lines = text.slice(4, end).split('\n');
  const fields = {};
  const sources = [];
  let inSources = false;
  for (const line of lines) {
    if (line === 'sources:') {
      inSources = true;
      continue;
    }
    if (inSources && line.startsWith('  ')) {
      const m = SOURCE_RE.exec(line);
      if (m) sources.push({ repo: m[1], path: m[2], sha: m[3] });
      else errors.push(`bad source line: ${line.trim()}`);
      continue;
    }
    inSources = false;
    const kv = /^([a-z]+): (.+)$/.exec(line);
    if (kv) fields[kv[1]] = kv[2];
    else if (line.trim()) errors.push(`bad front matter line: ${line}`);
  }
  if (!fields.role) errors.push('missing role');
  if (!/^\d+$/.test(fields.version ?? '')) errors.push('missing or non-numeric version');
  if (sources.length === 0) errors.push('no sources listed');
  return { role: fields.role, version: fields.version, sources, errors };
}

export function checkCard(file, { workspace, strict }) {
  const buf = readFileSync(file);
  const result = { file, errors: [], stale: [], unchecked: [] };
  if (buf.length > MAX_CARD_BYTES) {
    result.errors.push(`card is ${buf.length} bytes, limit ${MAX_CARD_BYTES}`);
  }
  const card = parseCard(buf.toString('utf8'));
  result.errors.push(...card.errors);
  for (const s of card.sources) {
    const repoDir = workspace ? join(workspace, s.repo) : null;
    if (!repoDir || !existsSync(repoDir)) {
      result.unchecked.push(`${s.repo}:${s.path}`);
      continue;
    }
    const src = join(repoDir, s.path);
    if (!existsSync(src)) {
      result.errors.push(`source missing: ${s.repo}:${s.path}`);
      continue;
    }
    const now = sha12(readFileSync(src));
    if (now !== s.sha) result.stale.push(`${s.repo}:${s.path} (card ${s.sha}, now ${now})`);
  }
  if (strict && result.unchecked.length) {
    result.errors.push(`--strict and ${result.unchecked.length} source(s) not reachable`);
  }
  result.ok = result.errors.length === 0 && result.stale.length === 0;
  return result;
}

function main(argv) {
  const here = dirname(fileURLToPath(import.meta.url));
  const args = { cards: resolve(here, '../../team/roles'), workspace: null, strict: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--workspace') args.workspace = resolve(argv[++i]);
    else if (argv[i] === '--cards') args.cards = resolve(argv[++i]);
    else if (argv[i] === '--strict') args.strict = true;
    else {
      console.error(`unknown argument: ${argv[i]}`);
      return 2;
    }
  }
  const files = readdirSync(args.cards).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.error(`no role cards in ${args.cards}`);
    return 1;
  }
  let failed = 0;
  for (const f of files.sort()) {
    const r = checkCard(join(args.cards, f), args);
    const status = r.ok ? (r.unchecked.length ? 'OK (some sources unchecked)' : 'OK') : 'FAIL';
    console.log(`${f}: ${status}`);
    for (const e of r.errors) console.log(`  error: ${e}`);
    for (const s of r.stale) console.log(`  stale: ${s}`);
    for (const u of r.unchecked) console.log(`  unchecked: ${u}`);
    if (!r.ok) failed++;
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)));
}
