import { describe, expect, it } from 'vitest';
import { checkAgents, checkManifest, commandAllowed, REQUIRED_DENY, ROLES, segments } from '../src/tools.mjs';

const role = (extra = {}) => ({ tools: ['Read', 'Grep', 'Glob', 'Bash'], commands: ['gh run list'], ...extra });
const manifest = () => ({
  deny: {
    merge: ['\\bgh\\s+pr\\s+merge\\b'],
    deploy: ['\\bwrangler\\s+deploy\\b'],
    production: ['--env[ =]production\\b'],
    secrets: ['\\.env\\b'],
    'repo-controls': ['\\bgh\\s+secret\\b'],
    'force-push': ['\\bgit\\s+push\\b'],
  },
  shared: ['grep', 'git log', 'cat'],
  roles: Object.fromEntries(ROLES.map((r) => [r, role()])),
});
const agents = () => ROLES.map((r) => ({ name: `team-${r}`, tools: ['Read', 'Grep', 'Glob', 'Bash'] }));

describe('checkManifest', () => {
  it('passes a whole manifest', () => {
    expect(checkManifest(manifest())).toEqual([]);
  });
  it('rejects a non-object', () => {
    expect(checkManifest(null)).toEqual(['manifest is not an object']);
    expect(checkManifest('x')).toEqual(['manifest is not an object']);
  });
  it.each(REQUIRED_DENY)('fails when deny.%s is dropped or emptied', (action) => {
    const m = manifest();
    m.deny = Object.fromEntries(Object.entries(m.deny).filter(([k]) => k !== action));
    expect(checkManifest(m)).toEqual([`deny.${action} is missing or empty`]);
    m.deny[action] = [];
    expect(checkManifest(m)).toEqual([`deny.${action} is missing or empty`]);
  });
  it('fails a bad pattern', () => {
    const m = manifest();
    m.deny.extra = ['('];
    expect(checkManifest(m)).toEqual(['deny.extra: bad pattern (']);
  });
  it('fails a missing, unknown or malformed role', () => {
    const m = manifest();
    delete m.roles.sre;
    m.roles.pilot = role();
    m.roles.tester = { tools: [] };
    expect(checkManifest(m)).toEqual([
      'no entry for role sre',
      'tester: tools is missing or empty',
      'tester: commands is missing',
      'entry for unknown role pilot',
    ]);
  });
  it.each(['Write', 'Edit', 'NotebookEdit'])('never grants %s', (tool) => {
    const m = manifest();
    m.roles.designer = role({ tools: ['Read', tool] });
    expect(checkManifest(m)).toEqual(['designer: a team agent is read-only; Write and Edit are never granted']);
  });
  it('does not mistake a tool that only contains Write for Write', () => {
    const m = manifest();
    m.roles.designer = role({ tools: ['Read', 'WriteNothing'] });
    expect(checkManifest(m)).toEqual([]);
  });
});

describe('checkAgents', () => {
  it('passes agents inside their manifest', () => {
    expect(checkAgents(agents(), manifest())).toEqual([]);
  });
  it('fails an agent asking for an extra tool (born red)', () => {
    const a = agents();
    a[0].tools.push('WebFetch', 'Write');
    expect(checkAgents(a, manifest())).toEqual(['team-architect: asks for WebFetch, Write, not in its manifest']);
  });
  it('fails an agent with no tools line, which would inherit every tool', () => {
    const a = agents();
    a[1].tools = [];
    expect(checkAgents(a, manifest())).toEqual(['team-back-end: no tools line; an agent without one inherits every tool']);
  });
  it('fails an agent with no manifest entry and a role with no agent', () => {
    const a = agents().filter((x) => x.name !== 'team-sre');
    a.push({ name: 'team-pilot', tools: ['Read'] });
    a.push({ name: null, tools: ['Read'] });
    expect(checkAgents(a, manifest())).toEqual([
      'team-pilot: no manifest entry for role pilot',
      'null: no manifest entry for role ',
      'no agent definition for role sre',
    ]);
  });
});

describe('segments', () => {
  it('splits pipes and lists, dropping harmless redirects', () => {
    expect(segments('grep -r x . 2>/dev/null | head -5 && ls; wc -l\ncat a || cat b')).toEqual([
      'grep -r x .',
      'head -5',
      'ls',
      'wc -l',
      'cat a',
      'cat b',
    ]);
    expect(segments('gh run view 1 2>&1 >/dev/null')).toEqual(['gh run view 1']);
  });
});

describe('commandAllowed', () => {
  const m = manifest();
  const ok = (r, c) => commandAllowed(m, r, c);
  it('allows shared and role commands, exact or with arguments', () => {
    expect(ok('sre', 'gh run list --limit 5')).toEqual({ ok: true, reason: 'allowed' });
    expect(ok('sre', 'gh run list')).toEqual({ ok: true, reason: 'allowed' });
    expect(ok('tester', 'git log --oneline | grep fix')).toEqual({ ok: true, reason: 'allowed' });
    expect(ok('sre', 'cat a 2>/dev/null')).toEqual({ ok: true, reason: 'allowed' });
  });
  it('does not treat a longer word as a prefix match', () => {
    expect(ok('sre', 'gh run listall')).toEqual({ ok: false, reason: "not in sre's allow list: gh run listall" });
    expect(ok('sre', 'catalog')).toEqual({ ok: false, reason: "not in sre's allow list: catalog" });
  });
  it('denies every irreversible action, deny before allow', () => {
    expect(ok('sre', 'gh pr merge 5')).toEqual({ ok: false, reason: 'denied: merge' });
    expect(ok('sre', 'wrangler deploy')).toEqual({ ok: false, reason: 'denied: deploy' });
    expect(ok('sre', 'gh run list --env production')).toEqual({ ok: false, reason: 'denied: production' });
    expect(ok('sre', 'cat .env')).toEqual({ ok: false, reason: 'denied: secrets' });
    expect(ok('sre', 'gh secret list')).toEqual({ ok: false, reason: 'denied: repo-controls' });
    expect(ok('sre', 'git log && git push origin x')).toEqual({ ok: false, reason: 'denied: force-push' });
  });
  it('denies substitution and write redirects', () => {
    expect(ok('sre', 'cat $(ls)')).toEqual({ ok: false, reason: 'command substitution is not allowed' });
    expect(ok('sre', 'cat `ls`')).toEqual({ ok: false, reason: 'command substitution is not allowed' });
    expect(ok('sre', 'cat a > b')).toEqual({ ok: false, reason: 'a redirect would write a file' });
    expect(ok('sre', 'cat a >> b 2>/dev/null')).toEqual({ ok: false, reason: 'a redirect would write a file' });
  });
  it('denies a command another role may run, and an unknown role', () => {
    const m2 = manifest();
    m2.roles.tester = role({ commands: ['gh pr view'] });
    expect(commandAllowed(m2, 'sre', 'gh pr view 1')).toEqual({ ok: false, reason: "not in sre's allow list: gh pr view 1" });
    expect(commandAllowed(m2, 'tester', 'gh pr view 1').ok).toBe(true);
    expect(ok('pilot', 'ls')).toEqual({ ok: false, reason: 'unknown role pilot' });
  });
  it('works with no shared list and no deny list', () => {
    const bare = { roles: { sre: role() } };
    expect(commandAllowed(bare, 'sre', 'gh run list').ok).toBe(true);
    expect(commandAllowed(bare, 'sre', 'grep x').ok).toBe(false);
  });
});

describe('URL prefixes', () => {
  it('lets a URL prefix continue with a path, but not a longer host', () => {
    const m = { roles: { sre: { tools: ['Bash'], commands: ['curl -sI https://stg.example.org', 'cat'] } } };
    expect(commandAllowed(m, 'sre', 'curl -sI https://stg.example.org/events').ok).toBe(true);
    expect(commandAllowed(m, 'sre', 'curl -sI https://stg.example.org.evil.net').ok).toBe(false);
    expect(commandAllowed(m, 'sre', 'cat/x').ok).toBe(false);
  });
});
