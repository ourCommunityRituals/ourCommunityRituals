export type Os = 'windows' | 'linux' | 'darwin';
export type RunnerStatus = 'online' | 'offline' | 'busy' | 'unknown';
export type RecoveryAction = 'service_restart' | 're_register';

export interface RunnerConfig {
  /** Unique name matching the GitHub runner name (e.g. BLOODRAVEN-3) */
  name: string;
  /** Absolute path to the runner installation directory */
  path: string;
  /** Windows scheduled task name — required on Windows */
  taskName?: string;
  /** systemd service name — required on Linux */
  serviceName?: string;
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
