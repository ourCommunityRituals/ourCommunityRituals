// Per-role tools, least access (team/tools.json).
//
// The manifest says, for each role, which tools its agent may ask for and
// which shell commands it may run. Shared to every role: a deny list of the
// irreversible actions no agent ever takes (merge, deploy, production,
// secrets, repository controls, force push).
//
// Two uses:
// 1. CI: an agent definition may not ask for a tool its manifest entry lacks,
//    and every role has an entry (checkAgents).
// 2. Run time (guardrails, later a PreToolUse hook): may this role run this
//    command? (commandAllowed)

export const ROLES = [
  'architect',
  'back-end',
  'data-scientist',
  'designer',
  'front-end',
  'integrator',
  'product-owner',
  'sre',
  'tester',
];

// The deny list must cover at least these actions; a manifest that drops one fails.
export const REQUIRED_DENY = ['merge', 'deploy', 'production', 'secrets', 'repo-controls', 'force-push'];

/** Shape checks on the manifest itself. Returns a list of errors. */
export function checkManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== 'object') return ['manifest is not an object'];
  const deny = manifest.deny ?? {};
  for (const action of REQUIRED_DENY) {
    if (!Array.isArray(deny[action]) || deny[action].length === 0) errors.push(`deny.${action} is missing or empty`);
  }
  for (const [action, patterns] of Object.entries(deny)) {
    for (const p of patterns ?? []) {
      try {
        new RegExp(p);
      } catch {
        errors.push(`deny.${action}: bad pattern ${p}`);
      }
    }
  }
  const roles = manifest.roles ?? {};
  for (const role of ROLES) {
    const r = roles[role];
    if (!r) {
      errors.push(`no entry for role ${role}`);
      continue;
    }
    if (!Array.isArray(r.tools) || r.tools.length === 0) errors.push(`${role}: tools is missing or empty`);
    if (!Array.isArray(r.commands)) errors.push(`${role}: commands is missing`);
    if (r.tools?.some((t) => /^(Write|Edit|NotebookEdit)$/.test(t))) {
      errors.push(`${role}: a team agent is read-only; Write and Edit are never granted`);
    }
  }
  for (const role of Object.keys(roles)) {
    if (!ROLES.includes(role)) errors.push(`entry for unknown role ${role}`);
  }
  return errors;
}

/**
 * Every agent's `tools:` must be a subset of its role's manifest tools.
 * @param {Array<{name:string, tools:string[]}>} agents parsed agent definitions
 */
export function checkAgents(agents, manifest) {
  const errors = [];
  const seen = new Set();
  for (const a of agents) {
    const role = (a.name ?? '').replace(/^team-/, '');
    seen.add(role);
    const entry = manifest.roles?.[role];
    if (!entry) {
      errors.push(`${a.name}: no manifest entry for role ${role}`);
      continue;
    }
    if (a.tools.length === 0) errors.push(`${a.name}: no tools line; an agent without one inherits every tool`);
    const extra = a.tools.filter((t) => !entry.tools.includes(t));
    if (extra.length) errors.push(`${a.name}: asks for ${extra.join(', ')}, not in its manifest`);
  }
  for (const role of ROLES) {
    if (!seen.has(role)) errors.push(`no agent definition for role ${role}`);
  }
  return errors;
}

// Harmless redirects stripped before the write check.
const SAFE_REDIRECTS = /\s(?:2>\/dev\/null|2>&1|>\/dev\/null)/g;

/** Split a command line into its pipeline / list segments. */
export function segments(command) {
  return command
    .replace(SAFE_REDIRECTS, '')
    .split(/\|\||&&|[|;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * May `role` run `command`? Denied when it matches any deny pattern, uses
 * command substitution or a write redirect, or when any segment starts with
 * none of the shared or role allow prefixes.
 * @returns {{ok: boolean, reason: string}}
 */
export function commandAllowed(manifest, role, command) {
  const entry = manifest.roles?.[role];
  if (!entry) return { ok: false, reason: `unknown role ${role}` };
  for (const [action, patterns] of Object.entries(manifest.deny ?? {})) {
    for (const p of patterns) {
      if (new RegExp(p).test(command)) return { ok: false, reason: `denied: ${action}` };
    }
  }
  if (/\$\(|`/.test(command)) return { ok: false, reason: 'command substitution is not allowed' };
  if (/>/.test(command.replace(SAFE_REDIRECTS, ''))) return { ok: false, reason: 'a redirect would write a file' };
  const allow = [...(manifest.shared ?? []), ...entry.commands];
  for (const seg of segments(command)) {
    // A prefix matches the whole segment, or a segment that continues with an
    // argument (a space) or, for a URL prefix, a path ('/').
    if (!allow.some((prefix) => seg === prefix || seg.startsWith(`${prefix} `) || (prefix.includes('://') && seg.startsWith(`${prefix}/`)))) {
      return { ok: false, reason: `not in ${role}'s allow list: ${seg}` };
    }
  }
  return { ok: true, reason: 'allowed' };
}
