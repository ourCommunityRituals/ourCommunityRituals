/**
 * Agent permissions are checked in, and the dangerous ones are denied (CCR F1).
 *
 * Every agent session in this repo reads .claude/settings.json. A local
 * settings.local.json can add to it but is gitignored, so this file is the one
 * shared floor. The deny list keeps agents from changing GitHub settings,
 * cutting releases or tags (tags start production workflows), reading or
 * writing secrets, pushing to main, and deploying. Those stay the owner's
 * commands. Merges and other `gh api` calls ask first.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const settings = JSON.parse(readFileSync(resolve(ROOT, '.claude/settings.json'), 'utf8'));
const perms = settings.permissions ?? {};
const deny: string[] = perms.deny ?? [];
const ask: string[] = perms.ask ?? [];
const allow: string[] = perms.allow ?? [];

const MUST_DENY = [
  'Bash(gh api * -X *)',
  'Bash(gh api * --method *)',
  'Bash(gh release*)',
  'Bash(gh secret*)',
  'Bash(gh workflow run*)',
  'Bash(doppler secrets*)',
  'Bash(git push --force*)',
  'Bash(git push * main*)',
  'Bash(git push * --tags*)',
  'Bash(git tag*)',
  'Bash(wrangler deploy*)',
  'Bash(npx wrangler deploy*)',
  'Bash(wrangler secret*)',
];

describe('CCR F1: shared agent permissions', () => {
  it.each(MUST_DENY)('denies %s', (rule) => {
    expect(deny).toContain(rule);
  });

  it('asks before a merge or any other gh api call', () => {
    expect(ask).toContain('Bash(gh pr merge*)');
    expect(ask).toContain('Bash(gh api*)');
  });

  it('allows no command that can run anything (python *, node *, bash *, git push *)', () => {
    const wide = allow.filter((r) =>
      /^Bash\((python3? \*|node \*|bash \*|sh \*|npx \*|pnpm \*|git push|gh api|gh \*|\*)/.test(r),
    );
    expect(wide).toEqual([]);
  });

  it('does not also allow anything it denies', () => {
    expect(allow.filter((r) => deny.includes(r))).toEqual([]);
  });
});
