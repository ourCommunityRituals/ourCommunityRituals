#!/usr/bin/env node
// Command line for the team's tooling. Reads files, calls the pure modules,
// prints. Writes only where --out says.
//
//   graph        [--hub DIR] [--brain DIR] [--private DIR] [--out FILE] [--public]
//   query        owner|rules|decisions TERM  (same file flags as graph)
//   tools-check  [--hub DIR]
//   tools-allow  ROLE COMMAND...
//   score        ANSWER --key KEY.json
//   evals        --scores FILE [--json]
//
// --hub defaults to this repo. --brain is the OCR-docs checkout (optional; adds
// invariants). --private is the owner's private team folder (optional; adds the
// sway table, names and memory decisions, and is never written anywhere public).
// Exit 0 = ok, 1 = a check failed, 2 = bad usage.

import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseAgent,
  parseInvariants,
  parseMemoryDecisions,
  parseNames,
  parseRoleCard,
  parseSway,
} from './sources.mjs';
import { buildGraph, decisionsAbout, publicGraph, rulesFor, validateGraph, whoLeads } from './graph.mjs';
import { checkAgents, checkManifest, commandAllowed } from './tools.mjs';
import { parseLines, report, scoreAnswer } from './evals.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(p, 'utf8');

function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--public' || a === '--json') out[a.slice(2)] = true;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
    else out._.push(a);
  }
  out.hub = resolve(out.hub ?? join(HERE, '../../..'));
  return out;
}

export function loadAgents(hub) {
  const dir = join(hub, '.claude/agents');
  return readdirSync(dir)
    .filter((f) => /^team-.+\.md$/.test(f))
    .sort()
    .map((f) => parseAgent(read(join(dir, f))));
}

export function loadInputs(f) {
  const cardDir = join(f.hub, 'team/roles');
  const cards = readdirSync(cardDir).filter((x) => x.endsWith('.md')).sort().map((x) => parseRoleCard(read(join(cardDir, x))));
  const input = { cards, agents: loadAgents(f.hub) };
  const unverified = {};
  if (f.brain) {
    const inv = join(f.brain, 'ocr-docs-brain/architectural-invariants.yaml');
    if (existsSync(inv)) input.invariants = parseInvariants(read(inv));
  }
  if (f.private) {
    const brief = join(f.private, 'room/agent-brief.md');
    if (existsSync(brief)) input.sway = parseSway(read(brief));
    const names = join(f.private, 'names.md');
    if (existsSync(names)) input.names = parseNames(read(names));
    const memDir = join(f.private, 'memory');
    input.memory = {};
    for (const card of cards) {
      const p = join(memDir, `${card.role}.md`);
      if (!existsSync(p)) continue;
      const m = parseMemoryDecisions(read(p));
      input.memory[card.role] = m;
      if (m.unverified.length) unverified[card.role] = m.unverified;
    }
  }
  return { input, unverified };
}

function cmdGraph(f) {
  const { input, unverified } = loadInputs(f);
  const graph = buildGraph(input);
  const v = validateGraph(graph, { unverified });
  const counts = {};
  for (const n of graph.nodes) counts[n.type] = (counts[n.type] ?? 0) + 1;
  console.log(`graph: ${graph.nodes.length} nodes, ${graph.edges.length} edges ${JSON.stringify(counts)}`);
  for (const w of v.warnings) console.log(`  warning: ${w}`);
  for (const e of v.errors) console.log(`  error: ${e}`);
  if (f.out) writeFileSync(f.out, `${JSON.stringify(f.public ? publicGraph(graph) : graph, null, 1)}\n`);
  return v.ok ? 0 : 1;
}

function cmdQuery(f) {
  const [what, ...rest] = f._;
  const term = rest.join(' ');
  if (!term) return usage();
  const graph = buildGraph(loadInputs(f).input);
  const fn = { owner: whoLeads, rules: rulesFor, decisions: decisionsAbout }[what];
  if (!fn) return usage();
  console.log(JSON.stringify(fn(graph, term), null, 1));
  return 0;
}

function cmdToolsCheck(f) {
  const manifest = JSON.parse(read(join(f.hub, 'team/tools.json')));
  const errors = [...checkManifest(manifest), ...checkAgents(loadAgents(f.hub), manifest)];
  for (const e of errors) console.log(`error: ${e}`);
  console.log(errors.length ? `tools: ${errors.length} error(s)` : 'tools: every team agent within its manifest');
  return errors.length ? 1 : 0;
}

function cmdToolsAllow(f) {
  const [role, ...cmd] = f._;
  if (!role || cmd.length === 0) return usage();
  const manifest = JSON.parse(read(join(f.hub, 'team/tools.json')));
  const r = commandAllowed(manifest, role, cmd.join(' '));
  console.log(`${r.ok ? 'allow' : 'deny'}: ${r.reason}`);
  return r.ok ? 0 : 1;
}

function cmdScore(f) {
  const [answer] = f._;
  if (!answer || !f.key) return usage();
  console.log(JSON.stringify(scoreAnswer(read(answer), JSON.parse(read(f.key))), null, 1));
  return 0;
}

function cmdEvals(f) {
  if (!f.scores) return usage();
  const { rows, bad } = parseLines(read(f.scores));
  const r = report(rows);
  if (f.json) console.log(JSON.stringify(r, null, 1));
  else {
    console.log('role | runs | latest | trend | status | alarms');
    for (const x of r) console.log(`${x.role} | ${x.runs} | ${x.latest} | ${x.trend.join(' ')} | ${x.status} (${x.why}) | ${x.alarms.join('; ') || '-'}`);
  }
  if (bad.length) console.log(`skipped unreadable lines: ${bad.join(', ')}`);
  return 0;
}

function usage() {
  console.error('usage: cli.mjs graph|query|tools-check|tools-allow|score|evals … (see the header of src/cli.mjs)');
  return 2;
}

const COMMANDS = { graph: cmdGraph, query: cmdQuery, 'tools-check': cmdToolsCheck, 'tools-allow': cmdToolsAllow, score: cmdScore, evals: cmdEvals };

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const fn = COMMANDS[cmd];
  process.exit(fn ? fn(flags(rest)) : usage());
}
