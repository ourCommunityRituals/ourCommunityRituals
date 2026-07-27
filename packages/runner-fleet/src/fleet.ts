import type { FleetConfig, FleetSnapshot, RunnerState } from './types.ts';
import { GitHubClient } from './github.ts';
import { TokenManager } from './token.ts';
import { Watchdog, type WatchdogEvent } from './watchdog.ts';

export class Fleet {
  private readonly gh: GitHubClient;
  private readonly tokens: TokenManager;
  private readonly watchdog: Watchdog;
  private readonly runnerState: Map<string, RunnerState> = new Map();
  private readonly eventLog: Array<{ ts: Date; event: WatchdogEvent }> = [];
  private static readonly MAX_LOG = 500;

  constructor(private readonly cfg: FleetConfig) {
    this.gh = new GitHubClient({
      token: cfg.githubToken,
      owner: cfg.repoOwner,
      repo: cfg.repoName,
    });
    this.tokens = new TokenManager(this.gh, cfg.tokenRefreshLeadMs);
    this.watchdog = new Watchdog(cfg, this.gh, this.tokens, this.runnerState);
    this.watchdog.onEvent((evt) => {
      this.eventLog.push({ ts: new Date(), event: evt });
      if (this.eventLog.length > Fleet.MAX_LOG) this.eventLog.shift();
    });
  }

  /** Start background watchdog + token pre-warm. */
  async start(): Promise<void> {
    await this.tokens.prefetch();
    this.watchdog.start();
  }

  stop(): void {
    this.watchdog.stop();
    this.tokens.stop();
  }

  /** Run a single watchdog cycle synchronously (for CLI one-shots). */
  async runOnce(): Promise<void> {
    await this.watchdog.tick();
  }

  async snapshot(): Promise<FleetSnapshot> {
    let queueDepth: number | null = null;
    try {
      queueDepth = await this.gh.getQueueDepth();
    } catch {
      // Non-fatal — dashboard shows '—' for unavailable
    }

    const runners = this.cfg.runners.map(
      (r): RunnerState =>
        this.runnerState.get(r.name) ?? {
          config: r,
          status: 'unknown',
          githubId: null,
          busy: false,
          lastSeenOnlineAt: null,
          restartAttempts: 0,
          lastRecovery: null,
          lastRecoveryAt: null,
          lastErrorCode: null,
        }
    );

    return {
      timestamp: new Date(),
      runners,
      queueDepth,
      pendingJobs: queueDepth ?? 0,
    };
  }

  getEventLog(): ReadonlyArray<{ ts: Date; event: WatchdogEvent }> {
    return this.eventLog;
  }

  onEvent(fn: (evt: WatchdogEvent) => void): void {
    this.watchdog.onEvent(fn);
  }
}
