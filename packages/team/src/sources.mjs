// Parsers for the files the team's knowledge graph is built from.
//
// Every parser is pure: text in, plain objects out. Reading files is the CLI's
// job (src/cli.mjs), so these run the same in tests, in CI and in a sandbox.
//
// Public sources (committed in the hub): role cards (team/roles/*.md), agent
// definitions (.claude/agents/team-*.md), the brain's invariants
// (OCR-docs ocr-docs-brain/architectural-invariants.yaml).
// Private sources (the owner's project files, read at run time, never
// committed): the sway table (room/agent-brief.md), names (names.md) and each
// role's memory (memory/<role>.md).

const CARD_SOURCE_RE = /^ {2}- ([A-Za-z0-9_.-]+):(\S+) sha256:([0-9a-f]{12})$/;
export const CMSG_RE = /cmsg_[A-Za-z0-9]{20,}/g;

/** Split `---\n...\n---\n` front matter from the body. */
export function splitFrontMatter(text) {
  if (!text.startsWith('---\n')) return { front: null, body: text };
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) return { front: null, body: text };
  return { front: text.slice(4, end), body: text.slice(end + 5) };
}

/** Lines of a markdown section (`## Title`) up to the next `## ` heading. */
export function section(body, title) {
  const lines = body.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${title}`);
  if (start === -1) return [];
  const out = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    out.push(line);
  }
  return out;
}

/** Top-level `- ` bullets of a section, one string each, continuation lines joined. */
export function bullets(lines) {
  const out = [];
  for (const line of lines) {
    if (line.startsWith('- ')) out.push(line.slice(2).trim());
    else if (out.length && line.startsWith('  ') && line.trim()) out[out.length - 1] += ` ${line.trim()}`;
  }
  return out;
}

/**
 * A role card: role, version, sources, the question it answers, its lane and
 * its pre-read rules.
 */
export function parseRoleCard(text) {
  const { front, body } = splitFrontMatter(text);
  const card = { role: null, version: null, sources: [], question: null, lane: null, rules: [], may: [], mayNot: [] };
  if (front === null) return card;
  for (const line of front.split('\n')) {
    const src = CARD_SOURCE_RE.exec(line);
    if (src) {
      card.sources.push({ repo: src[1], path: src[2] });
      continue;
    }
    const kv = /^(role|version): (.+)$/.exec(line);
    if (kv) card[kv[1]] = kv[2].trim();
  }
  const q = /^\*\*Question:\*\* (.+)$/m.exec(body);
  if (q) card.question = q[1].trim();
  const lane = /^\*\*Lane:\*\* (.+)$/m.exec(body);
  if (lane) card.lane = lane[1].trim();
  card.rules = bullets(section(body, 'Rules, pre-read'));
  for (const b of bullets(section(body, 'May and may not'))) {
    if (b.startsWith('May not:')) card.mayNot.push(b.slice('May not:'.length).trim());
    else if (b.startsWith('May:')) card.may.push(b.slice('May:'.length).trim());
  }
  return card;
}

/** An agent definition: name, tool list and model from its front matter. */
export function parseAgent(text) {
  const { front } = splitFrontMatter(text);
  const agent = { name: null, tools: [], model: null };
  if (front === null) return agent;
  for (const line of front.split('\n')) {
    const kv = /^(name|tools|model): (.+)$/.exec(line);
    if (!kv) continue;
    if (kv[1] === 'tools') agent.tools = kv[2].split(',').map((t) => t.trim()).filter(Boolean);
    else agent[kv[1]] = kv[2].trim();
  }
  return agent;
}

/**
 * The brain's invariants, read without a YAML library: each entry under
 * `invariants:` starts with `  - id: <n>` and carries name, title, status and
 * group at four spaces. Only those five fields are read.
 */
export function parseInvariants(yaml) {
  const out = [];
  const start = yaml.search(/^invariants:\s*$/m);
  if (start === -1) return out;
  let cur = null;
  for (const line of yaml.slice(start).split('\n').slice(1)) {
    if (/^\S/.test(line)) break;
    const id = /^ {2}- id: (\d+)\s*$/.exec(line);
    if (id) {
      cur = { id: Number(id[1]), name: null, title: null, status: null, group: null };
      out.push(cur);
      continue;
    }
    const kv = /^ {4}(name|title|status|group): (.+?)\s*$/.exec(line);
    if (cur && kv) cur[kv[1]] = kv[2].replace(/^"(.*)"$/, '$1');
  }
  return out;
}

/** Split one markdown table row into trimmed cells. */
export function cells(row) {
  return row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** Is this row a `| --- | --- |` separator? */
function isSeparator(row) {
  return cells(row).every((c) => /^:?-{3,}:?$/.test(c));
}

/**
 * The names table (`| Name | Role | Why |`) as a map of name to role. Rows
 * whose name is pending, in parentheses, are skipped.
 */
export function parseNames(text) {
  const map = {};
  for (const line of text.split('\n')) {
    if (!line.trim().startsWith('|') || isSeparator(line)) continue;
    const [name, role] = cells(line);
    if (!name || name === 'Name' || name.startsWith('(') || !role) continue;
    map[name] = role;
  }
  return map;
}

/** Split a sway cell ("Samwell, Brienne", "-", "Advise") into names. */
function names(cell) {
  if (!cell || cell === '-' || cell === 'Advise' || cell === 'None') return [];
  return cell.split(',').map((n) => n.trim()).filter(Boolean);
}

/**
 * The sway table: `| Domain | Lead | Strong | Hold | Everyone else |`.
 * Returns one row per domain with lead, strong and hold name lists.
 */
export function parseSway(text) {
  const lines = text.split('\n');
  const head = lines.findIndex((l) => /^\|\s*Domain\s*\|\s*Lead\s*\|/.test(l));
  if (head === -1) return [];
  const out = [];
  for (const line of lines.slice(head + 1)) {
    if (!line.trim().startsWith('|')) break;
    if (isSeparator(line)) continue;
    const [domain, lead, strong, hold] = cells(line);
    out.push({ domain, lead: names(lead), strong: names(strong), hold: names(hold) });
  }
  return out;
}

/**
 * Decisions in a role's memory file: every bullet that names Matt. A bullet
 * that cites a cmsg id is a decision with provenance; one that does not is
 * returned as unverified (memory-provenance rule: a "Matt decided" line with
 * no message id is not a decision).
 */
export const DECISION_RE = /\bMatt (decided|chose|ruled|approved|said)\b|\(Matt[,:]|\bMatt:/;

export function parseMemoryDecisions(text) {
  const decisions = [];
  const unverified = [];
  for (const b of bullets(text.split('\n'))) {
    if (!/\bMatt\b/.test(b)) continue;
    const ids = [...new Set(b.match(CMSG_RE) ?? [])];
    if (ids.length) decisions.push({ text: b, cmsg: ids });
    else if (DECISION_RE.test(b)) unverified.push(b);
  }
  return { decisions, unverified };
}

/** Invariant numbers a piece of text cites, as `#7` or `[#1 #7]`. */
export function citedInvariants(text) {
  return [...new Set([...text.matchAll(/#(\d{1,2})\b/g)].map((m) => Number(m[1])))];
}
