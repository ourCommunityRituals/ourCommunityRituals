export type Os = 'windows' | 'linux' | 'darwin';
export type RunnerStatus = 'online' | 'offline' | 'busy' | 'unknown';
export type RecoveryAction = 'service_restart' | 're_register';

/**
 * GitHub registration scope for a runner. `repo` runners live under
 * /repos/{owner}/{repo}; `org` runners live under /orgs/{owner} and are
 * INVISIBLE to the repo endpoints (why an org-level runner like BLOODRAVEN-2
 * cannot be seen or recovered until the fleet queries the org scope).
 */
export type RunnerScope = 'org' | 'repo';

export interface RunnerConfig {
  /** Unique name matching the GitHub runner name (e.g. BLOODRAVEN-3) */
  name: string;
  /** Absolute path to the runner installation directory */
  path: string;
  /** Windows scheduled task name — required on Windows */
  taskName?: string;
  /** systemd service name — required on Linux */
  serviceName?: string;
  /** Registration scope. Default 'repo'. Org runners require 'org'. */
  scope?: RunnerScope;
  /** Runner labels for re-registration. Default ['self-hosted','Windows','X64']. */
  labels?: string[];
}

export interface FleetConfig {
  /** GitHub PAT with repo scope (for Actions runner management endpoints) */
  githubToken: string;
  repoOwner: string;
  repoName: string;
  runners: RunnerConfig[];
  /** How often the watchdog polls GitHub (ms). Default: 60_000 */
  watchdogIntervalMs?: number;
  /**
   * How far before token expiry to pre-fetch a replacement (ms).
   * GitHub tokens expire in 60 min. Default: 15 min lead = refresh at 45 min mark.
   */
  tokenRefreshLeadMs?: number;
  /** Restart attempts before escalating to full re-registration. Default: 2 */
  maxRestartAttempts?: number;
  /**
   * Who owns dwell-cap kills of a no-log HANG (a runner stuck online+busy).
   * 'janitor' (default): the invariant-#12 janitor+probe scheduled task owns it
   * on production runners — the fleet detector stays DORMANT to avoid a
   * split-brain double-bounce. 'fleet': the fleet's own busy-dwell detector is
   * armed (use only on janitor-incapable hosts).
   */
  hangOwner?: 'janitor' | 'fleet';
  /**
   * How long a runner may stay online+busy before the fleet detector (when
   * hangOwner==='fleet') treats it as a no-log hang. Default: 15 min.
   */
  hangDeadlineMs?: number;
}

export interface GitHubRunnerRecord {
  id: number;
  name: string;
  os: string;
  status: 'online' | 'offline';
  busy: boolean;
}

export interface RegistrationToken {
  token: string;
  expiresAt: Date;
}

export interface RunnerState {
  config: RunnerConfig;
  status: RunnerStatus;
  githubId: number | null;
  busy: boolean;
  /** When the runner first went busy in the current busy streak (null if idle). */
  busySince: Date | null;
  lastSeenOnlineAt: Date | null;
  restartAttempts: number;
  lastRecovery: RecoveryAction | null;
  lastRecoveryAt: Date | null;
  lastErrorCode: string | null;
}

export interface FleetSnapshot {
  timestamp: Date;
  runners: RunnerState[];
  queueDepth: number | null;
  pendingJobs: number;
}
