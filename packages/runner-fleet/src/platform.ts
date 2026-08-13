import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Os } from './types.ts';
import { RunnerFleetError, ErrorCode } from './errors.ts';

const execFileAsync = promisify(execFile);

/**
 * Run a PowerShell script passed as a SINGLE argument via execFile — no outer
 * cmd.exe/sh parses it, so interpolated values can't break out into shell
 * injection. (Task names are config-controlled; this still removes the shell.)
 */
async function pwsh(script: string): Promise<string> {
  const { stdout } = await execFileAsync('powershell', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    script,
  ]);
  return stdout;
}

export function detectOs(): Os {
  switch (process.platform) {
    case 'win32':
      return 'windows';
    case 'darwin':
      return 'darwin';
    default:
      return 'linux';
  }
}

export interface ServiceOpts {
  taskName?: string;
  serviceName?: string;
  /** Runner install dir — enables the path-scoped terminal kill on stop. */
  path?: string;
}

export async function stopService(opts: ServiceOpts, os: Os): Promise<void> {
  if (os === 'windows') {
    const task = opts.taskName;
    if (!task)
      throw new RunnerFleetError(ErrorCode.CONFIG_INVALID, 'taskName required on Windows');
    try {
      await pwsh(`Stop-ScheduledTask -TaskName '${task}' -ErrorAction Stop`);
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.SERVICE_STOP_FAILED,
        `Stop-ScheduledTask '${task}' failed`,
        { cause: e }
      );
    }
    // TERMINAL: Stop-ScheduledTask does NOT kill a WEDGED Runner.Listener/Worker
    // (the no-log hang). When the runner path is known, force-kill any runner
    // process rooted under it — path-scoped, no elevation, best-effort. This is
    // what makes hang recovery actually terminate the stuck job.
    if (opts.path) {
      const p = opts.path.replace(/'/g, "''");
      try {
        await pwsh(
          `Get-Process Runner.Listener,Runner.Worker -ErrorAction SilentlyContinue | ` +
            `Where-Object { $_.Path -and $_.Path.StartsWith('${p}') } | ` +
            `Stop-Process -Force -ErrorAction SilentlyContinue`
        );
      } catch {
        // best-effort — a clean stop leaves nothing to kill
      }
    }
  } else if (os === 'linux') {
    const svc = opts.serviceName;
    if (!svc)
      throw new RunnerFleetError(ErrorCode.CONFIG_INVALID, 'serviceName required on Linux');
    try {
      await execFileAsync('systemctl', ['stop', svc]);
    } catch (e) {
      throw new RunnerFleetError(ErrorCode.SERVICE_STOP_FAILED, `systemctl stop '${svc}' failed`, {
        cause: e,
      });
    }
  } else {
    throw new RunnerFleetError(
      ErrorCode.PLATFORM_UNSUPPORTED,
      'macOS service management not yet implemented — see docs/LIMITATIONS.md'
    );
  }
}

export async function startService(opts: ServiceOpts, os: Os): Promise<void> {
  if (os === 'windows') {
    const task = opts.taskName;
    if (!task)
      throw new RunnerFleetError(ErrorCode.CONFIG_INVALID, 'taskName required on Windows');
    try {
      await pwsh(`Start-ScheduledTask -TaskName '${task}' -ErrorAction Stop`);
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.SERVICE_START_FAILED,
        `Start-ScheduledTask '${task}' failed`,
        { cause: e }
      );
    }
  } else if (os === 'linux') {
    const svc = opts.serviceName;
    if (!svc)
      throw new RunnerFleetError(ErrorCode.CONFIG_INVALID, 'serviceName required on Linux');
    try {
      await execFileAsync('systemctl', ['start', svc]);
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.SERVICE_START_FAILED,
        `systemctl start '${svc}' failed`,
        { cause: e }
      );
    }
  } else {
    throw new RunnerFleetError(
      ErrorCode.PLATFORM_UNSUPPORTED,
      'macOS service management not yet implemented — see docs/LIMITATIONS.md'
    );
  }
}

export async function getServiceState(
  opts: ServiceOpts,
  os: Os
): Promise<'running' | 'stopped' | 'unknown'> {
  if (os === 'windows') {
    const task = opts.taskName;
    if (!task) return 'unknown';
    try {
      const stdout = await pwsh(`(Get-ScheduledTask -TaskName '${task}').State`);
      const state = stdout.trim().toLowerCase();
      if (state === 'running') return 'running';
      if (state === 'ready') return 'stopped';
      return 'unknown';
    } catch {
      return 'unknown';
    }
  } else if (os === 'linux') {
    const svc = opts.serviceName;
    if (!svc) return 'unknown';
    try {
      const { stdout } = await execFileAsync('systemctl', ['is-active', svc]);
      return stdout.trim() === 'active' ? 'running' : 'stopped';
    } catch {
      return 'stopped';
    }
  }
  return 'unknown';
}

export async function registerRunner(
  opts: {
    runnerPath: string;
    repoUrl: string;
    token: string;
    name: string;
    labels?: string[];
  },
  os: Os
): Promise<void> {
  const labels = opts.labels?.join(',') ?? 'self-hosted';
  // Arg-ARRAY (execFile, no shell): the registration token is a discrete argv
  // element, never concatenated into a shell command string — so it can't be
  // shell-parsed/injected and never touches a shell history. (config.* has no
  // stdin token option, so the token remains a process arg — unavoidable — but
  // the shell-string leak/injection is closed.)
  const args = [
    '--url',
    opts.repoUrl,
    '--token',
    opts.token,
    '--name',
    opts.name,
    '--labels',
    labels,
    '--unattended',
    '--replace',
  ];

  if (os === 'windows') {
    try {
      await execFileAsync(`${opts.runnerPath}\\config.cmd`, args);
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.REGISTRATION_FAILED,
        `config.cmd failed for runner '${opts.name}'`,
        { runnerName: opts.name, cause: e }
      );
    }
  } else if (os === 'linux' || os === 'darwin') {
    try {
      await execFileAsync(`${opts.runnerPath}/config.sh`, args);
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.REGISTRATION_FAILED,
        `config.sh failed for runner '${opts.name}'`,
        { runnerName: opts.name, cause: e }
      );
    }
  } else {
    throw new RunnerFleetError(
      ErrorCode.PLATFORM_UNSUPPORTED,
      'Unsupported platform for runner registration'
    );
  }
}
