import type { RegistrationToken, RunnerScope } from './types.ts';
import type { GitHubClient } from './github.ts';
import { RunnerFleetError, ErrorCode } from './errors.ts';

/** Refresh 15 minutes before the 60-minute expiry window closes. */
const DEFAULT_LEAD_MS = 15 * 60 * 1000;

/**
 * Manages GitHub Actions runner registration tokens.
 *
 * Tokens expire in 60 minutes. This manager pre-fetches a replacement
 * before expiry (configurable lead window) so runners always have a
 * valid token ready for re-registration without a blocking round-trip.
 */
export class TokenManager {
  // Tokens are SCOPE-SPECIFIC: an org registration token cannot register a repo
  // runner and vice-versa, so each scope has its own cache + refresh timer.
  private readonly cached = new Map<RunnerScope, RegistrationToken>();
  private readonly refreshTimers = new Map<RunnerScope, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly client: GitHubClient,
    private readonly refreshLeadMs: number = DEFAULT_LEAD_MS
  ) {}

  /** Get a valid registration token for a scope, fetching fresh if stale. */
  async getToken(scope: RunnerScope = 'repo'): Promise<RegistrationToken> {
    const c = this.cached.get(scope);
    if (this.isValid(c)) return c;
    return this.refresh(scope);
  }

  /** Force-fetch a new token for a scope immediately and update its cache. */
  async refresh(scope: RunnerScope = 'repo'): Promise<RegistrationToken> {
    let tok: RegistrationToken;
    try {
      tok = await this.client.fetchRegistrationToken(scope);
    } catch (e) {
      if (e instanceof RunnerFleetError) throw e;
      throw new RunnerFleetError(ErrorCode.TOKEN_FETCH_FAILED, 'Registration token fetch failed', {
        cause: e,
      });
    }
    this.cached.set(scope, tok);
    this.scheduleRefresh(scope, tok);
    return tok;
  }

  /**
   * Pre-warm: ensure a valid token is cached for each scope now so the first
   * recovery attempt has zero latency waiting for a token fetch.
   */
  async prefetch(scopes: readonly RunnerScope[] = ['repo']): Promise<void> {
    for (const scope of new Set(scopes)) {
      if (!this.isValid(this.cached.get(scope))) {
        await this.refresh(scope);
      }
    }
  }

  stop(): void {
    for (const timer of this.refreshTimers.values()) clearTimeout(timer);
    this.refreshTimers.clear();
  }

  private isValid(tok: RegistrationToken | undefined): tok is RegistrationToken {
    if (tok === undefined) return false;
    return tok.expiresAt.getTime() - this.refreshLeadMs > Date.now();
  }

  private scheduleRefresh(scope: RunnerScope, tok: RegistrationToken): void {
    const existing = this.refreshTimers.get(scope);
    if (existing !== undefined) clearTimeout(existing);
    const delay = tok.expiresAt.getTime() - this.refreshLeadMs - Date.now();
    if (delay <= 0) return;
    const timer = setTimeout(() => {
      void this.refresh(scope);
    }, delay);
    timer.unref();
    this.refreshTimers.set(scope, timer);
  }
}
