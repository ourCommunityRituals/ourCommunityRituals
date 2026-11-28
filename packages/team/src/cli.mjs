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
//   trust        --log FILE --scores FILE [--approved role,role] [--code-owners-on]
//   cost         --log FILE [--json]
//   append       --file FILE --json-line '{...}'   (locked append; use instead of >>)
//   guard        --state '{"budgetMinutes":60,"elapsedMinutes":130,...}'
//   route        --event-name NAME --payload EVENT.json   (prints the roles to wake)
//   dashboard    --scores FILE --log FILE [--room FILE] [--out FILE]
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
import { history, parseLines, report, scoreAnswer } from './evals.mjs';
import { appendLine, checkRunLine } from './log.mjs';
import { checkRun } from './guard.mjs';
import { rung } from './trust.mjs';
import { rollup } from './cost.mjs';
import { classify, route } from './events.mjs';
import { buildDashboard, parseRoomLog } from './dashboard.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(p, 'utf8');

function flags(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--public' || a === '--json' || a === '--code-owners-on') out[a.slice(2)] = true;
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

function readLog(file) {
  const { rows, bad } = parseLines(read(file));
  const good = [];
  for (const r of rows) {
    const errors = checkRunLine(r);
    if (errors.length) bad.push(`${JSON.stringify(r).slice(0, 60)}: ${errors.join('; ')}`);
    else good.push(r);
  }
  return { rows: good, bad };
}

function cmdTrust(f) {
  if (!f.log || !f.scores) return usage();
  const log = readLog(f.log);
  const evals = history(parseLines(read(f.scores)).rows);
  const approved = new Set((f.approved ?? '').split(',').filter(Boolean));
  const roles = [...new Set([...Object.keys(evals), ...log.rows.map((r) => r.role)])].filter((r) => evals[r]).sort();
  console.log('role | rung | why');
  for (const role of roles) {
    const r = rung({
      runs: log.rows.filter((x) => x.role === role),
      evals: evals[role],
      ownerApproved: approved.has(role),
      codeOwnersOn: Boolean(f['code-owners-on']),
    });
    console.log(`${role} | ${r.rung} ${r.name} | ${r.why}`);
  }
  for (const b of log.bad) console.log(`skipped log line: ${b}`);
  return 0;
}

function cmdCost(f) {
  if (!f.log) return usage();
  const log = readLog(f.log);
  const rows = rollup(log.rows);
  if (f.json) console.log(JSON.stringify(rows, null, 1));
  else {
    console.log('week | role | runs | minutes | tokens | $ | found | confirmed | $ per confirmed');
    for (const r of rows) {
      console.log(`${r.week} | ${r.role} | ${r.runs} | ${r.minutes} | ${r.tokens} | ${r.cost_usd ?? '-'} | ${r.found} | ${r.confirmed} | ${r.cost_per_confirmed ?? '-'}`);
    }
  }
  for (const b of log.bad) console.log(`skipped log line: ${b}`);
  return 0;
}

function cmdAppend(f) {
  if (!f.file || !f['json-line']) return usage();
  const obj = JSON.parse(f['json-line']);
  appendLine(f.file, obj);
  return 0;
}

function cmdGuard(f) {
  if (!f.state) return usage();
  const r = checkRun(JSON.parse(f.state));
  console.log(JSON.stringify(r));
  return r.stop ? 1 : 0;
}

function cmdRoute(f) {
  if (!f['event-name'] || !f.payload) return usage();
  const payload = JSON.parse(read(f.payload));
  const event = classify(f['event-name'], payload);
  const pr = payload.pull_request;
  // GitHub's payload has no file list; a later step (once switched on) adds
  // changed_paths from `gh pr diff --name-only`. Without it, base roles only.
  const paths = Array.isArray(pr?.changed_paths) ? pr.changed_paths : [];
  console.log(JSON.stringify({ event, roles: event ? route(event, paths) : [] }));
  return 0;
}

function cmdDashboard(f) {
  if (!f.scores || !f.log) return usage();
  const data = buildDashboard({
    scores: parseLines(read(f.scores)).rows,
    log: readLog(f.log).rows,
    room: f.room ? parseRoomLog(read(f.room)) : [],
    now: new Date().toISOString(),
  });
  const text = `${JSON.stringify(data, null, 1)}\n`;
  if (f.out) writeFileSync(f.out, text);
  else process.stdout.write(text);
  return 0;
}

function usage() {
  console.error('usage: cli.mjs graph|query|tools-check|tools-allow|score|evals|trust|cost|append|guard|route|dashboard … (see the header of src/cli.mjs)');
  return 2;
}

const COMMANDS = {
  graph: cmdGraph,
  query: cmdQuery,
  'tools-check': cmdToolsCheck,
  'tools-allow': cmdToolsAllow,
  score: cmdScore,
  evals: cmdEvals,
  trust: cmdTrust,
  cost: cmdCost,
  append: cmdAppend,
  guard: cmdGuard,
  route: cmdRoute,
  dashboard: cmdDashboard,
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const fn = COMMANDS[cmd];
  process.exit(fn ? fn(flags(rest)) : usage());
}
