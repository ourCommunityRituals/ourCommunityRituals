export const ErrorCode = {
  // Token lifecycle
  TOKEN_FETCH_FAILED: 'TOKEN_FETCH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  // Registration
  REGISTRATION_LOST: 'REGISTRATION_LOST',
  REGISTRATION_FAILED: 'REGISTRATION_FAILED',
  // Service management
  SERVICE_START_FAILED: 'SERVICE_START_FAILED',
  SERVICE_STOP_FAILED: 'SERVICE_STOP_FAILED',
  // Network
  NETWORK_DROP: 'NETWORK_DROP',
  RATE_LIMITED: 'RATE_LIMITED',
  // Jobs
  JOB_STUCK: 'JOB_STUCK',
  QUEUE_TIMEOUT: 'QUEUE_TIMEOUT',
  // Platform
  PLATFORM_UNSUPPORTED: 'PLATFORM_UNSUPPORTED',
  PLATFORM_CMD_FAILED: 'PLATFORM_CMD_FAILED',
  // Config
  CONFIG_INVALID: 'CONFIG_INVALID',
  RUNNER_NOT_FOUND: 'RUNNER_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/** Codes that the fleet can automatically recover from without human intervention. */
export const RECOVERABLE: ReadonlySet<ErrorCode> = new Set<ErrorCode>([
  ErrorCode.TOKEN_EXPIRED,
  ErrorCode.TOKEN_FETCH_FAILED,
  ErrorCode.REGISTRATION_LOST,
  ErrorCode.SERVICE_START_FAILED,
  ErrorCode.SERVICE_STOP_FAILED,
  ErrorCode.NETWORK_DROP,
]);

export class RunnerFleetError extends Error {
  readonly code: ErrorCode;
  readonly runnerName: string | undefined;
  readonly recoverable: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    opts?: { runnerName?: string; cause?: unknown }
  ) {
    super(message, { cause: opts?.cause });
    this.name = 'RunnerFleetError';
    this.code = code;
    this.runnerName = opts?.runnerName;
    this.recoverable = RECOVERABLE.has(code);
  }
}
