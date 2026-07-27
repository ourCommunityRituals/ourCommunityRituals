import type { GitHubRunnerRecord, RegistrationToken } from './types.ts';
import { RunnerFleetError, ErrorCode } from './errors.ts';

export interface GitHubClientConfig {
  token: string;
  owner: string;
  repo: string;
}

async function ghFetch<T>(
  url: string,
  token: string,
  opts?: RequestInit
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts?.headers ?? {}),
      },
    });
  } catch (e) {
    throw new RunnerFleetError(
      ErrorCode.NETWORK_DROP,
      `GitHub API unreachable: ${url}`,
      { cause: e }
    );
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After') ?? 'unknown';
    throw new RunnerFleetError(
      ErrorCode.RATE_LIMITED,
      `GitHub API rate limited — Retry-After: ${retryAfter}s`
    );
  }
  if (res.status === 401 || res.status === 403) {
    throw new RunnerFleetError(
      ErrorCode.TOKEN_INVALID,
      `GitHub API auth failed (${res.status}) — verify GITHUB_TOKEN has repo scope`
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '(unreadable)');
    throw new RunnerFleetError(
      ErrorCode.NETWORK_DROP,
      `GitHub API ${res.status} from ${url}: ${body}`
    );
  }

  return res.json() as Promise<T>;
}

export class GitHubClient {
  private readonly base: string;

  constructor(private readonly cfg: GitHubClientConfig) {
    this.base = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}`;
  }

  async listRunners(): Promise<GitHubRunnerRecord[]> {
    const data = await ghFetch<{ runners: GitHubRunnerRecord[] }>(
      `${this.base}/actions/runners`,
      this.cfg.token
    );
    return data.runners;
  }

  async fetchRegistrationToken(): Promise<RegistrationToken> {
    const data = await ghFetch<{ token: string; expires_at: string }>(
      `${this.base}/actions/runners/registration-token`,
      this.cfg.token,
      { method: 'POST' }
    );
    return { token: data.token, expiresAt: new Date(data.expires_at) };
  }

  async getQueueDepth(): Promise<number> {
    const data = await ghFetch<{ total_count: number }>(
      `${this.base}/actions/runs?status=queued&per_page=1`,
      this.cfg.token
    );
    return data.total_count;
  }

  async deleteRunner(runnerId: number): Promise<void> {
    await ghFetch<void>(
      `${this.base}/actions/runners/${runnerId}`,
      this.cfg.token,
      { method: 'DELETE' }
    );
  }
}
