// The team's knowledge graph: one small JSON object of nodes and edges, built
// on demand from the role cards, the agent files, the brain's invariants and
// (at run time only) the private sway table, names and memory.
//
// No graph database and no outside service. Agents query it instead of
// rereading the corpus: who leads a domain, which rules bind a file, what Matt
// decided about a topic and where he said it.
//
// Node ids:  role:<role>  agent:<name>  rule:<role>:<n>  file:<repo>:<path>
//            inv:<n>  domain:<slug>  member:<slug>  decision:<cmsg>
// Edge kinds: runs (agent→role), owns (role→rule), reads (role→file),
//            cites (rule→inv), lead / strong / hold (domain→role|member),
//            recorded (role→decision), is (member→role)

import { citedInvariants } from './sources.mjs';

export const EDGE_KINDS = ['runs', 'owns', 'reads', 'cites', 'lead', 'strong', 'hold', 'recorded', 'is'];

/** Lowercase, words joined by '-'. */
export function slug(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Role names as people write them, mapped to role-card ids.
const ROLE_ALIASES = {
  'product-owner': 'product-owner',
  po: 'product-owner',
  tester: 'tester',
  sre: 'sre',
  'data-scientist': 'data-scientist',
  architect: 'architect',
  integrator: 'integrator',
  'back-end': 'back-end',
  'front-end': 'front-end',
  'front-end-integration': 'front-end',
  designer: 'designer',
};

/** Map a role as written ("SRE", "front-end-integration") to a card id, or null. */
export function roleId(text) {
  return ROLE_ALIASES[slug(text)] ?? null;
}

/**
 * Build the graph.
 * @param {object} input
 * @param {Array} input.cards   parsed role cards (parseRoleCard)
 * @param {Array} input.agents  parsed agent definitions (parseAgent)
 * @param {Array} [input.invariants] parsed brain invariants
 * @param {Array} [input.sway]  parsed sway rows (private)
 * @param {object} [input.names] name → role as written (private)
 * @param {object} [input.memory] role → { decisions, unverified } (private)
 */
export function buildGraph({ cards, agents, invariants = [], sway = [], names = {}, memory = {} }) {
  const nodes = new Map();
  const edges = [];
  const add = (id, type, props = {}) => {
    if (!nodes.has(id)) nodes.set(id, { id, type, ...props });
    return id;
  };
  const link = (from, kind, to) => edges.push({ from, kind, to });

  for (const inv of invariants) {
    add(`inv:${inv.id}`, 'invariant', { title: inv.title, status: inv.status, group: inv.group });
  }

  for (const card of cards) {
    if (!card.role) continue;
    const r = add(`role:${card.role}`, 'role', {
      question: card.question,
      lane: card.lane,
      version: card.version,
    });
    card.rules.forEach((text, i) => {
      const rule = add(`rule:${card.role}:${i + 1}`, 'rule', { text });
      link(r, 'owns', rule);
      // Cites are linked only when the brain was read; a card citing a number
      // the brain does not have is then a dangling edge, and fails validation.
      if (invariants.length) for (const n of citedInvariants(text)) link(rule, 'cites', `inv:${n}`);
    });
    for (const s of card.sources) {
      link(r, 'reads', add(`file:${s.repo}:${s.path}`, 'file', { repo: s.repo, path: s.path }));
    }
  }

  for (const agent of agents) {
    if (!agent.name) continue;
    const a = add(`agent:${agent.name}`, 'agent', { tools: agent.tools, model: agent.model });
    const role = agent.name.replace(/^team-/, '');
    link(a, 'runs', `role:${role}`);
  }

  // Names (private): each known name becomes a member, linked to its role.
  const memberOf = {};
  for (const [name, written] of Object.entries(names)) {
    const m = add(`member:${slug(name)}`, 'member', { name });
    memberOf[name] = m;
    const role = roleId(written);
    if (role) link(m, 'is', `role:${role}`);
  }

  // Sway (private): domain → lead / strong / hold. A voice that is not a named
  // member (for example "business companion") still becomes a member node.
  const voice = (who) => memberOf[who] ?? add(`member:${slug(who)}`, 'member', { name: who });
  for (const row of sway) {
    const d = add(`domain:${slug(row.domain)}`, 'domain', { name: row.domain, leads: row.lead.length });
    for (const kind of ['lead', 'strong', 'hold']) {
      for (const who of row[kind]) link(d, kind, voice(who));
    }
  }

  // Memory (private): decisions with provenance, linked to the role that keeps them.
  for (const [role, mem] of Object.entries(memory)) {
    for (const d of mem.decisions) {
      const id = add(`decision:${d.cmsg[0]}`, 'decision', { text: d.text, cmsg: d.cmsg });
      link(`role:${role}`, 'recorded', id);
    }
  }

  return { nodes: [...nodes.values()], edges };
}

/**
 * Structural checks. Errors fail the build; warnings are reported.
 * - every edge ends at a node that exists, and has a known kind
 * - every role owns at least one rule, and is run by exactly one agent
 * - every agent runs a role that has a card
 * - every sway domain has a lead
 * - decisions without a message id are warnings (memory-provenance rule)
 */
export function validateGraph(graph, { unverified = {} } = {}) {
  const errors = [];
  const warnings = [];
  const ids = new Set(graph.nodes.map((n) => n.id));
  for (const e of graph.edges) {
    if (!EDGE_KINDS.includes(e.kind)) errors.push(`unknown edge kind ${e.kind} (${e.from} → ${e.to})`);
    if (!ids.has(e.from)) errors.push(`edge from missing node ${e.from}`);
    if (!ids.has(e.to)) errors.push(`edge ${e.from} -${e.kind}→ missing node ${e.to}`);
  }
  const out = (id, kind) => graph.edges.filter((e) => e.from === id && e.kind === kind);
  const into = (id, kind) => graph.edges.filter((e) => e.to === id && e.kind === kind);
  for (const n of graph.nodes) {
    if (n.type === 'role') {
      if (out(n.id, 'owns').length === 0) errors.push(`${n.id} owns no rules`);
      const runners = into(n.id, 'runs').length;
      if (runners !== 1) errors.push(`${n.id} is run by ${runners} agents, expected 1`);
    }
    if (n.type === 'domain' && out(n.id, 'lead').length === 0) errors.push(`${n.id} has no lead`);
  }
  for (const [role, lines] of Object.entries(unverified)) {
    for (const l of lines) warnings.push(`unverified decision in ${role} memory (no cmsg id): ${l.slice(0, 80)}`);
  }
  return { errors, warnings, ok: errors.length === 0 };
}

/** Index helpers shared by the queries. */
function index(graph) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const from = (id, kind) => graph.edges.filter((e) => e.from === id && e.kind === kind).map((e) => byId.get(e.to));
  const to = (id, kind) => graph.edges.filter((e) => e.to === id && e.kind === kind).map((e) => byId.get(e.from));
  return { byId, from, to };
}

/** A member or role node as a short label: "Samwell (data-scientist)", "role:sre". */
function label(node, idx) {
  if (node.type !== 'member') return node.id;
  const role = idx.from(node.id, 'is')[0];
  return role ? `${node.name} (${role.id.slice(5)})` : node.name;
}

/** Who leads, sways and can hold each domain whose name contains `term`. */
export function whoLeads(graph, term) {
  const idx = index(graph);
  const t = term.toLowerCase();
  return graph.nodes
    .filter((n) => n.type === 'domain' && n.name.toLowerCase().includes(t))
    .map((d) => ({
      domain: d.name,
      lead: idx.from(d.id, 'lead').map((n) => label(n, idx)),
      strong: idx.from(d.id, 'strong').map((n) => label(n, idx)),
      hold: idx.from(d.id, 'hold').map((n) => label(n, idx)),
    }));
}

/**
 * Rules that bind a file: the rules of every role whose card reads it, plus
 * any rule whose text names the file. `file` is a repo-relative path,
 * optionally prefixed "<repo>:".
 */
export function rulesFor(graph, file) {
  const idx = index(graph);
  const path = file.includes(':') ? file.slice(file.indexOf(':') + 1) : file;
  const base = path.split('/').pop();
  const hits = new Map();
  for (const n of graph.nodes) {
    if (n.type !== 'file') continue;
    const match = file.includes(':') ? n.id === `file:${file}` : n.path === path;
    if (!match) continue;
    for (const role of idx.to(n.id, 'reads')) {
      for (const rule of idx.from(role.id, 'owns')) hits.set(rule.id, { role: role.id.slice(5), rule: rule.text });
    }
  }
  for (const n of graph.nodes) {
    if (n.type === 'rule' && base && n.text.includes(base)) {
      hits.set(n.id, { role: n.id.split(':')[1], rule: n.text });
    }
  }
  return [...hits.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
}

/** Decisions (with their message ids) whose text contains `term`. */
export function decisionsAbout(graph, term) {
  const idx = index(graph);
  const t = term.toLowerCase();
  return graph.nodes
    .filter((n) => n.type === 'decision' && n.text.toLowerCase().includes(t))
    .map((d) => ({ text: d.text, cmsg: d.cmsg, keptBy: idx.to(d.id, 'recorded').map((r) => r.id.slice(5)) }));
}

/** The graph with every private node and edge removed: what may be committed or uploaded. */
export function publicGraph(graph) {
  const privateTypes = new Set(['member', 'domain', 'decision']);
  const keep = new Set(graph.nodes.filter((n) => !privateTypes.has(n.type)).map((n) => n.id));
  return {
    nodes: graph.nodes.filter((n) => keep.has(n.id)),
    edges: graph.edges.filter((e) => keep.has(e.from) && keep.has(e.to)),
  };
}
