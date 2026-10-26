import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenManager } from '../src/token.ts';
import type { GitHubClient } from '../src/github.ts';
import { RunnerFleetError, ErrorCode } from '../src/errors.ts';

function makeClient(expiresInMs = 60 * 60 * 1000): GitHubClient {
  return {
    fetchRegistrationToken: vi.fn().mockResolvedValue({
      token: 'ghrt-test',
      expiresAt: new Date(Date.now() + expiresInMs),
    }),
    listRunners: vi.fn(),
    getQueueDepth: vi.fn(),
    deleteRunner: vi.fn(),
  } as unknown as GitHubClient;
}

describe('TokenManager', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches on first getToken()', async () => {
    const client = makeClient();
    const mgr = new TokenManager(client);
    const tok = await mgr.getToken();
    expect(tok.token).toBe('ghrt-test');
    expect(client.fetchRegistrationToken).toHaveBeenCalledOnce();
    mgr.stop();
  });

  it('returns cached token without re-fetching while valid', async () => {
    const client = makeClient();
    const mgr = new TokenManager(client);
    await mgr.getToken();
    await mgr.getToken();
    await mgr.getToken();
    expect(client.fetchRegistrationToken).toHaveBeenCalledOnce();
    mgr.stop();
  });

  it('re-fetches when token is within the lead window', async () => {
    // Token expires in 5 min, lead = 15 min → token is immediately stale
    const client = makeClient(5 * 60 * 1000);
    const mgr = new TokenManager(client, 15 * 60 * 1000);
    await mgr.getToken();
    await mgr.getToken();
    expect(client.fetchRegistrationToken).toHaveBeenCalledTimes(2);
    mgr.stop();
  });

  it('prefetch() does not double-fetch when token is already valid', async () => {
    const client = makeClient();
    const mgr = new TokenManager(client);
    await mgr.prefetch();
    await mgr.prefetch();
    expect(client.fetchRegistrationToken).toHaveBeenCalledOnce();
    mgr.stop();
  });

  it('throws TOKEN_FETCH_FAILED when API call fails', async () => {
    const client = makeClient();
    vi.mocked(client.fetchRegistrationToken).mockRejectedValueOnce(new Error('500'));
    const mgr = new TokenManager(client);
    await expect(mgr.getToken()).rejects.toMatchObject({ code: ErrorCode.TOKEN_FETCH_FAILED });
    mgr.stop();
  });

  it('re-throws RunnerFleetError from client unchanged', async () => {
    const client = makeClient();
    const original = new RunnerFleetError(ErrorCode.TOKEN_INVALID, 'bad auth');
    vi.mocked(client.fetchRegistrationToken).mockRejectedValueOnce(original);
    const mgr = new TokenManager(client);
    await expect(mgr.getToken()).rejects.toBe(original);
    mgr.stop();
  });

  it('refresh() forces a new fetch even when cache is valid', async () => {
    const client = makeClient();
    const mgr = new TokenManager(client);
    await mgr.getToken();
    await mgr.refresh();
    expect(client.fetchRegistrationToken).toHaveBeenCalledTimes(2);
    mgr.stop();
  });
});
