import { describe, it, expect, vi, afterEach } from 'vitest';
import { GitHubClient } from '../src/github.ts';

const cfg = { token: 't', owner: 'ourCommunityRituals', repo: 'ourSharedEvents' };

function stubFetch(json: unknown) {
  const f = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: new Map(),
    json: async () => json,
    text: async () => '',
  });
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe('GitHubClient scope routing (org vs repo)', () => {
  it('listRunners("repo") hits the /repos endpoint', async () => {
    const f = stubFetch({ runners: [] });
    await new GitHubClient(cfg).listRunners('repo');
    expect(f.mock.calls[0][0]).toBe(
      'https://api.github.com/repos/ourCommunityRituals/ourSharedEvents/actions/runners'
    );
  });

  it('listRunners("org") hits the /orgs endpoint (so BLOODRAVEN-2 is visible)', async () => {
    const f = stubFetch({ runners: [] });
    await new GitHubClient(cfg).listRunners('org');
    expect(f.mock.calls[0][0]).toBe(
      'https://api.github.com/orgs/ourCommunityRituals/actions/runners'
    );
  });

  it('defaults to repo scope when omitted', async () => {
    const f = stubFetch({ runners: [] });
    await new GitHubClient(cfg).listRunners();
    expect(f.mock.calls[0][0]).toContain('/repos/');
  });

  it('fetchRegistrationToken("org") POSTs to the org registration-token endpoint', async () => {
    const f = stubFetch({ token: 'x', expires_at: '2026-01-01T00:00:00Z' });
    await new GitHubClient(cfg).fetchRegistrationToken('org');
    expect(f.mock.calls[0][0]).toBe(
      'https://api.github.com/orgs/ourCommunityRituals/actions/runners/registration-token'
    );
    expect((f.mock.calls[0][1] as RequestInit).method).toBe('POST');
  });

  it('getQueueDepth stays REPO-scoped (GitHub has no org runs API)', async () => {
    const f = stubFetch({ total_count: 3 });
    const n = await new GitHubClient(cfg).getQueueDepth();
    expect(n).toBe(3);
    expect(f.mock.calls[0][0]).toContain(
      '/repos/ourCommunityRituals/ourSharedEvents/actions/runs'
    );
  });

  it('deleteRunner(id, "org") DELETEs under /orgs', async () => {
    const f = stubFetch({});
    await new GitHubClient(cfg).deleteRunner(42, 'org');
    expect(f.mock.calls[0][0]).toBe(
      'https://api.github.com/orgs/ourCommunityRituals/actions/runners/42'
    );
    expect((f.mock.calls[0][1] as RequestInit).method).toBe('DELETE');
  });
});
