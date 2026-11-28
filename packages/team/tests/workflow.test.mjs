// Contract for .github/workflows/team-events.yml: prepared, switched off,
// read-only, no secrets, no model call. Reads the repo; excluded from the
// mutation run.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HUB = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const wf = readFileSync(join(HUB, '.github/workflows/team-events.yml'), 'utf8');
const code = wf.split('\n').filter((l) => !l.trim().startsWith('#')).join('\n');

describe('team-events workflow', () => {
  it('gates every job on TEAM_EVENTS_ON', () => {
    const jobs = code.slice(code.indexOf('\njobs:')).split('\n').filter((l) => /^ {2}[a-z][\w-]*:\s*$/.test(l));
    expect(jobs.length).toBeGreaterThan(0);
    const gates = code.match(/^ {4}if: vars\.TEAM_EVENTS_ON == 'true'$/gm) ?? [];
    expect(gates).toHaveLength(jobs.length);
  });
  it('is read-only and uses no secrets', () => {
    expect(code).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(code).not.toMatch(/:\s*write\b/);
    expect(code).not.toMatch(/secrets\./);
    expect(code).toMatch(/persist-credentials: false/);
  });
  it('has no step that calls a model while it is switched off', () => {
    expect(code).not.toMatch(/anthropic|claude-code-action|ANTHROPIC|id-token/i);
  });
  it('pins every action to a commit', () => {
    const uses = code.match(/uses: \S+/g) ?? [];
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u).toMatch(/@[0-9a-f]{40}$/);
  });
});
