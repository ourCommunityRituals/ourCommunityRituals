import { describe, expect, it } from 'vitest';
import { parseAgent, parseInvariants, parseMemoryDecisions, parseNames, parseRoleCard, parseSway } from '../src/sources.mjs';
import { buildGraph, decisionsAbout, publicGraph, roleId, rulesFor, slug, validateGraph, whoLeads } from '../src/graph.mjs';
import { AGENT, BRIEF, CARD, INVARIANTS, MEMORY, NAMES } from './fixtures.mjs';

const card = parseRoleCard(CARD);
const agent = parseAgent(AGENT);
const full = () =>
  buildGraph({
    cards: [card],
    agents: [agent],
    invariants: parseInvariants(INVARIANTS),
    sway: parseSway(BRIEF),
    names: parseNames(NAMES),
    memory: { sre: parseMemoryDecisions(MEMORY) },
  });

describe('helpers', () => {
  it('slugs and maps roles', () => {
    expect(slug("  Matt's time, now ")).toBe('matt-s-time-now');
    expect(roleId('SRE')).toBe('sre');
    expect(roleId('front-end-integration')).toBe('front-end');
    expect(roleId('Product owner')).toBe('product-owner');
    expect(roleId('security junior')).toBeNull();
  });
});

describe('buildGraph', () => {
  it('builds role, rules, files, agent and cites', () => {
    const g = full();
    const ids = g.nodes.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['role:sre', 'rule:sre:1', 'rule:sre:3', 'agent:team-sre', 'inv:5', 'inv:8', 'file:ourSharedEvents:AGENTS.md']));
    expect(g.edges).toEqual(expect.arrayContaining([
      { from: 'role:sre', kind: 'owns', to: 'rule:sre:1' },
      { from: 'rule:sre:3', kind: 'cites', to: 'inv:5' },
      { from: 'rule:sre:3', kind: 'cites', to: 'inv:8' },
      { from: 'agent:team-sre', kind: 'runs', to: 'role:sre' },
      { from: 'role:sre', kind: 'reads', to: 'file:ourSharedEvents:AGENTS.md' },
    ]));
    expect(g.nodes.find((n) => n.id === 'role:sre')).toMatchObject({ question: 'does CI tell the truth?', version: '2' });
    expect(g.nodes.find((n) => n.id === 'agent:team-sre')).toMatchObject({ tools: ['Read', 'Grep', 'Glob', 'Bash'] });
  });
  it('skips cites when the brain was not read', () => {
    const g = buildGraph({ cards: [card], agents: [agent] });
    expect(g.edges.some((e) => e.kind === 'cites')).toBe(false);
    expect(validateGraph(g).ok).toBe(true);
  });
  it('adds members, domains and decisions from private input', () => {
    const g = full();
    expect(g.edges).toEqual(expect.arrayContaining([
      { from: 'member:egg', kind: 'is', to: 'role:sre' },
      { from: 'domain:ci-pipeline-trust', kind: 'lead', to: 'member:egg' },
      { from: 'domain:ci-pipeline-trust', kind: 'strong', to: 'member:research-fellow' },
      { from: 'domain:privacy-and-data', kind: 'hold', to: 'member:egg' },
      { from: 'role:sre', kind: 'recorded', to: 'decision:cmsg_01AAAAAAAAAAAAAAAAAAAAAAAAAA' },
    ]));
    expect(g.edges.filter((e) => e.from === 'member:ghost')).toEqual([]);
    expect(g.nodes.filter((n) => n.id === 'member:egg')).toHaveLength(1);
  });
  it('skips cards and agents without a name', () => {
    const g = buildGraph({ cards: [{ ...card, role: null }], agents: [{ name: null, tools: [] }] });
    expect(g.nodes).toEqual([]);
  });
});

describe('validateGraph', () => {
  it('passes a whole graph', () => {
    expect(validateGraph(full())).toEqual({ errors: [], warnings: [], ok: true });
  });
  it('fails a dangling edge and an unknown kind', () => {
    const g = full();
    g.edges.push({ from: 'role:sre', kind: 'likes', to: 'role:nobody' });
    g.edges.push({ from: 'role:ghost', kind: 'owns', to: 'rule:sre:1' });
    const v = validateGraph(g);
    expect(v.ok).toBe(false);
    expect(v.errors).toEqual([
      'unknown edge kind likes (role:sre → role:nobody)',
      'edge role:sre -likes→ missing node role:nobody',
      'edge from missing node role:ghost',
    ]);
  });
  it('fails a card citing an invariant the brain lacks', () => {
    const c = parseRoleCard(CARD.replace('[#5 #8]', '[#5 #31]'));
    const g = buildGraph({ cards: [c], agents: [agent], invariants: parseInvariants(INVARIANTS) });
    expect(validateGraph(g).errors).toEqual(['edge rule:sre:3 -cites→ missing node inv:31']);
  });
  it('fails a role with no rules, no agent, or two agents', () => {
    const bare = { ...card, rules: [] };
    expect(validateGraph(buildGraph({ cards: [bare], agents: [agent] })).errors).toEqual(['role:sre owns no rules']);
    expect(validateGraph(buildGraph({ cards: [card], agents: [] })).errors).toEqual(['role:sre is run by 0 agents, expected 1']);
    const two = buildGraph({ cards: [card], agents: [agent, { ...agent, name: 'team-sre' }] });
    expect(validateGraph(two).errors).toEqual(['role:sre is run by 2 agents, expected 1']);
  });
  it('fails an agent with no card', () => {
    const g = buildGraph({ cards: [card], agents: [agent, { name: 'team-pilot', tools: [] }] });
    expect(validateGraph(g).errors).toEqual(['edge agent:team-pilot -runs→ missing node role:pilot']);
  });
  it('fails a domain with no lead', () => {
    const g = buildGraph({ cards: [card], agents: [agent], sway: [{ domain: 'Orphan', lead: [], strong: ['Egg'], hold: [] }] });
    expect(validateGraph(g).errors).toEqual(['domain:orphan has no lead']);
  });
  it('warns on unverified decisions, trimmed to 80 characters', () => {
    const v = validateGraph(full(), { unverified: { sre: ['x'.repeat(100)] } });
    expect(v.ok).toBe(true);
    expect(v.warnings).toEqual([`unverified decision in sre memory (no cmsg id): ${'x'.repeat(80)}`]);
  });
});

describe('queries', () => {
  it('whoLeads matches case-insensitively and labels members with roles', () => {
    expect(whoLeads(full(), 'PIPELINE')).toEqual([
      { domain: 'CI, pipeline trust', lead: ['Egg (sre)'], strong: ['Ana (sre)', 'research fellow'], hold: [] },
    ]);
    expect(whoLeads(full(), 'nothing')).toEqual([]);
  });
  it('rulesFor finds rules by card source and by file name in the text', () => {
    const byPath = rulesFor(full(), 'scripts/ci/classify-ci-failure.mjs');
    expect(byPath.map((r) => r.rule)).toEqual([card.rules[0], card.rules[1], card.rules[2]]);
    expect(rulesFor(full(), 'ourSharedEvents:AGENTS.md')).toHaveLength(3);
    expect(rulesFor(full(), 'otherRepo:AGENTS.md')).toEqual([]);
    expect(rulesFor(full(), 'lib/classify-ci-failure.mjs')).toEqual([{ role: 'sre', rule: card.rules[1] }]);
    expect(rulesFor(full(), 'nowhere.ts')).toEqual([]);
  });
  it('rulesFor sorts by rule id', () => {
    const ids = rulesFor(full(), 'AGENTS.md').map((r) => r.rule);
    expect(ids).toEqual(card.rules);
  });
  it('decisionsAbout returns text, ids and keeper', () => {
    expect(decisionsAbout(full(), 'CAP')).toEqual([
      { text: 'Matt decided the cap is 4 (cmsg_01AAAAAAAAAAAAAAAAAAAAAAAAAA).', cmsg: ['cmsg_01AAAAAAAAAAAAAAAAAAAAAAAAAA'], keptBy: ['sre'] },
    ]);
    expect(decisionsAbout(full(), 'zebra')).toEqual([]);
  });
  it('publicGraph drops members, domains and decisions and their edges', () => {
    const p = publicGraph(full());
    expect(p.nodes.some((n) => ['member', 'domain', 'decision'].includes(n.type))).toBe(false);
    expect(p.edges.some((e) => ['lead', 'strong', 'hold', 'is', 'recorded'].includes(e.kind))).toBe(false);
    expect(p.edges.some((e) => e.kind === 'owns')).toBe(true);
    expect(validateGraph(p).ok).toBe(true);
  });
});
