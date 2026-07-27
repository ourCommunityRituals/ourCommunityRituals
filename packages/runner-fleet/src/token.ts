import type { RegistrationToken } from './types.ts';
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
  private cached: RegistrationToken | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly client: GitHubClient,
    private readonly refreshLeadMs: number = DEFAULT_LEAD_MS
  ) {}

  /** Get a valid registration token, fetching fresh if the cache is stale. */
  async getToken(): Promise<RegistrationToken> {
    if (this.isValid(this.cached)) return this.cached;
    return this.refresh();
  }

  /** Force-fetch a new token immediately and update the cache. */
  async refresh(): Promise<RegistrationToken> {
    let tok: RegistrationToken;
    try {
      tok = await this.client.fetchRegistrationToken();
    } catch (e) {
      if (e instanceof RunnerFleetError) throw e;
      throw new RunnerFleetError(ErrorCode.TOKEN_FETCH_FAILED, 'Registration token fetch failed', {
        cause: e,
      });
    }
    this.cached = tok;
    this.scheduleRefresh(tok);
    return tok;
  }

  /**
   * Pre-warm: ensure a valid token is cached now so the first recovery
   * attempt has zero latency waiting for a token fetch.
   */
  async prefetch(): Promise<void> {
    if (!this.isValid(this.cached)) {
      await this.refresh();
    }
  }

  stop(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private isValid(tok: RegistrationToken | null): tok is RegistrationToken {
    if (tok === null) return false;
    return tok.expiresAt.getTime() - this.refreshLeadMs > Date.now();
  }

  private scheduleRefresh(tok: RegistrationToken): void {
    this.stop();
    const delay = tok.expiresAt.getTime() - this.refreshLeadMs - Date.now();
    if (delay <= 0) return;
    this.refreshTimer = setTimeout(() => {
      void this.refresh();
    }, delay);
    this.refreshTimer.unref?.();
  }
}
