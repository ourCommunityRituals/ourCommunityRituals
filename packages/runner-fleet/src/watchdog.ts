import type { FleetConfig, RunnerState, GitHubRunnerRecord } from './types.ts';
import { RunnerFleetError, ErrorCode } from './errors.ts';
import type { GitHubClient } from './github.ts';
import type { TokenManager } from './token.ts';
import {
  detectOs,
  stopService,
  startService,
  getServiceState,
  registerRunner,
} from './platform.ts';

const RESTART_SETTLE_MS = 20_000;

export type WatchdogEvent =
  | { type: 'runner_offline'; runner: string }
  | { type: 'restart_attempted'; runner: string }
  | { type: 'restart_succeeded'; runner: string }
  | { type: 'restart_failed'; runner: string; error: RunnerFleetError }
  | { type: 're_register_attempted'; runner: string }
  | { type: 're_register_succeeded'; runner: string }
  | { type: 'recovery_failed'; runner: string; error: RunnerFleetError }
  | { type: 'all_healthy' };

export class Watchdog {
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly os = detectOs();
  private readonly listeners: Array<(evt: WatchdogEvent) => void> = [];

  constructor(
    private readonly cfg: FleetConfig,
    private readonly gh: GitHubClient,
    private readonly tokens: TokenManager,
    private readonly state: Map<string, RunnerState>
  ) {}

  onEvent(fn: (evt: WatchdogEvent) => void): void {
    this.listeners.push(fn);
  }

  start(): void {
    const intervalMs = this.cfg.watchdogIntervalMs ?? 60_000;
    this.timer = setInterval(() => {
      void this.tick();
    }, intervalMs);
    this.timer.unref?.();
    void this.tick();
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async tick(): Promise<void> {
    // List runners across every scope present in the config (org + repo), then
    // merge — an org-level runner (BLOODRAVEN-2) is invisible to the repo
    // endpoint, so a repo-only listing would report it perpetually offline.
    const scopes = new Set(this.cfg.runners.map((r) => r.scope ?? 'repo'));
    const liveRunners: GitHubRunnerRecord[] = [];
    try {
      for (const scope of scopes) {
        liveRunners.push(...(await this.gh.listRunners(scope)));
      }
    } catch {
      // Network drop — skip cycle silently; don't escalate recovery
      return;
    }

    const byName = new Map(liveRunners.map((r) => [r.name, r]));
    let allHealthy = true;

    for (const runnerCfg of this.cfg.runners) {
      const live = byName.get(runnerCfg.name);
      const s = this.ensureState(runnerCfg.name);

      if (live !== undefined && live.status === 'online') {
        s.status = live.busy ? 'busy' : 'online';
        s.busy = live.busy;
        s.githubId = live.id;
        s.lastSeenOnlineAt = new Date();
        s.restartAttempts = 0;
        continue;
      }

      allHealthy = false;
      s.status = 'offline';
      this.emit({ type: 'runner_offline', runner: runnerCfg.name });
      await this.recover(s);
    }

    if (allHealthy) this.emit({ type: 'all_healthy' });
  }

  private async recover(s: RunnerState): Promise<void> {
    const cfg = s.config;
    const maxAttempts = this.cfg.maxRestartAttempts ?? 2;
    const serviceOpts = { taskName: cfg.taskName, serviceName: cfg.serviceName };

    if (s.restartAttempts < maxAttempts) {
      this.emit({ type: 'restart_attempted', runner: cfg.name });
      try {
        await stopService(serviceOpts, this.os);
        await wait(2_000);
        await startService(serviceOpts, this.os);
        await wait(RESTART_SETTLE_MS);
        const state = await getServiceState(serviceOpts, this.os);
        s.restartAttempts += 1;
        if (state === 'running') {
          s.lastRecovery = 'service_restart';
          s.lastRecoveryAt = new Date();
          this.emit({ type: 'restart_succeeded', runner: cfg.name });
          return;
        }
        const err = new RunnerFleetError(
          ErrorCode.SERVICE_START_FAILED,
          `Runner '${cfg.name}' did not come online after restart`,
          { runnerName: cfg.name }
        );
        s.lastErrorCode = err.code;
        this.emit({ type: 'restart_failed', runner: cfg.name, error: err });
      } catch (e) {
        s.restartAttempts += 1;
        const err =
          e instanceof RunnerFleetError
            ? e
            : new RunnerFleetError(ErrorCode.SERVICE_START_FAILED, String(e), {
                runnerName: cfg.name,
                cause: e,
              });
        s.lastErrorCode = err.code;
        this.emit({ type: 'restart_failed', runner: cfg.name, error: err });
      }
    }

    // Escalate: full re-registration with a fresh token. Scope-aware — an org
    // runner registers against the ORG url with an org token; a repo runner
    // against the repo url with a repo token. Labels come from config.
    const scope = cfg.scope ?? 'repo';
    this.emit({ type: 're_register_attempted', runner: cfg.name });
    try {
      const regToken = await this.tokens.refresh(scope);
      const registrationUrl =
        scope === 'org'
          ? `https://github.com/${this.cfg.repoOwner}`
          : `https://github.com/${this.cfg.repoOwner}/${this.cfg.repoName}`;
      await registerRunner(
        {
          runnerPath: cfg.path,
          repoUrl: registrationUrl,
          token: regToken.token,
          name: cfg.name,
          labels: cfg.labels ?? ['self-hosted', 'Windows', 'X64'],
        },
        this.os
      );
      await wait(2_000);
      await startService(serviceOpts, this.os);
      s.lastRecovery = 're_register';
      s.lastRecoveryAt = new Date();
      s.restartAttempts = 0;
      s.lastErrorCode = null;
      this.emit({ type: 're_register_succeeded', runner: cfg.name });
    } catch (e) {
      const err =
        e instanceof RunnerFleetError
          ? e
          : new RunnerFleetError(ErrorCode.REGISTRATION_FAILED, String(e), {
              runnerName: cfg.name,
              cause: e,
            });
      s.lastErrorCode = err.code;
      this.emit({ type: 'recovery_failed', runner: cfg.name, error: err });
    }
  }

  private ensureState(name: string): RunnerState {
    let s = this.state.get(name);
    if (s === undefined) {
      const cfg = this.cfg.runners.find((r) => r.name === name);
      if (cfg === undefined)
        throw new RunnerFleetError(ErrorCode.RUNNER_NOT_FOUND, `Runner '${name}' not in config`);
      s = {
        config: cfg,
        status: 'unknown',
        githubId: null,
        busy: false,
        lastSeenOnlineAt: null,
        restartAttempts: 0,
        lastRecovery: null,
        lastRecoveryAt: null,
        lastErrorCode: null,
      };
      this.state.set(name, s);
    }
    return s;
  }

  private emit(evt: WatchdogEvent): void {
    for (const fn of this.listeners) fn(evt);
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
