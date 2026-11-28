// Integration layer: the real role cards, agent files and team/tools.json in
// this repo. Excluded from the mutation run (Stryker's sandbox has no repo).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadAgents, loadInputs } from '../src/cli.mjs';
import { buildGraph, publicGraph, validateGraph } from '../src/graph.mjs';
import { checkAgents, checkManifest, commandAllowed, ROLES } from '../src/tools.mjs';

const HUB = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const manifest = JSON.parse(readFileSync(join(HUB, 'team/tools.json'), 'utf8'));

describe('the hub repo', () => {
  it('builds a valid public graph from the real cards and agents', () => {
    const { input } = loadInputs({ hub: HUB });
    const g = buildGraph(input);
    const v = validateGraph(g);
    expect(v.errors).toEqual([]);
    expect(g.nodes.filter((n) => n.type === 'role').map((n) => n.id.slice(5)).sort()).toEqual([...ROLES].sort());
    expect(publicGraph(g)).toEqual(g);
  });
  it('keeps every team agent inside team/tools.json', () => {
    expect(checkManifest(manifest)).toEqual([]);
    expect(checkAgents(loadAgents(HUB), manifest)).toEqual([]);
  });
  it('real manifest: the reads each role needs pass, the irreversible actions fail', () => {
    expect(commandAllowed(manifest, 'sre', 'gh run list --branch main --limit 20').ok).toBe(true);
    expect(commandAllowed(manifest, 'sre', 'node scripts/ci/classify-ci-failure.mjs --run-id 1').ok).toBe(true);
    expect(commandAllowed(manifest, 'front-end', 'curl -sI https://stg.oursharedevents.com/events').ok).toBe(true);
    for (const r of ROLES) expect(commandAllowed(manifest, r, 'node scripts/team/check-role-cards.mjs --strict').ok).toBe(true);
    const denied = {
      'gh pr merge 12 --squash': 'merge',
      'npx wrangler deploy --env staging': 'deploy',
      'curl -sI https://oursharedevents.com': 'production',
      'curl -s https://www.ourwkrp.com': 'production',
      'wrangler d1 execute DB --remote --command "select 1"': 'production',
      'cat .dev.vars': 'secrets',
      'printenv': 'secrets',
      'gh api repos/o/r/branches/main/protection': 'repo-controls',
      'gh api -X DELETE repos/o/r/issues/1': 'repo-controls',
      'git push --force origin main': 'force-push',
      'find . -name x -delete': 'writes',
      'sed -i s/a/b/ f': 'writes',
      'git commit -m x': 'writes',
    };
    for (const [cmd, action] of Object.entries(denied)) {
      expect([cmd, commandAllowed(manifest, 'sre', cmd).reason]).toEqual([cmd, `denied: ${action}`]);
    }
  });
});
