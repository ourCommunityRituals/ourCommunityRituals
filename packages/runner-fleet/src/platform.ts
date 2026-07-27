import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import type { Os } from './types.ts';
import { RunnerFleetError, ErrorCode } from './errors.ts';

const execAsync = promisify(exec);

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

export async function stopService(
  opts: { taskName?: string; serviceName?: string },
  os: Os
): Promise<void> {
  if (os === 'windows') {
    const task = opts.taskName;
    if (!task)
      throw new RunnerFleetError(ErrorCode.CONFIG_INVALID, 'taskName required on Windows');
    try {
      await execAsync(
        `powershell -NoProfile -NonInteractive -Command "Stop-ScheduledTask -TaskName '${task}' -ErrorAction Stop"`
      );
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.SERVICE_STOP_FAILED,
        `Stop-ScheduledTask '${task}' failed`,
        { cause: e }
      );
    }
  } else if (os === 'linux') {
    const svc = opts.serviceName;
    if (!svc)
      throw new RunnerFleetError(ErrorCode.CONFIG_INVALID, 'serviceName required on Linux');
    try {
      await execAsync(`systemctl stop ${svc}`);
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.SERVICE_STOP_FAILED,
        `systemctl stop '${svc}' failed`,
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

export async function startService(
  opts: { taskName?: string; serviceName?: string },
  os: Os
): Promise<void> {
  if (os === 'windows') {
    const task = opts.taskName;
    if (!task)
      throw new RunnerFleetError(ErrorCode.CONFIG_INVALID, 'taskName required on Windows');
    try {
      await execAsync(
        `powershell -NoProfile -NonInteractive -Command "Start-ScheduledTask -TaskName '${task}' -ErrorAction Stop"`
      );
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
      await execAsync(`systemctl start ${svc}`);
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
  opts: { taskName?: string; serviceName?: string },
  os: Os
): Promise<'running' | 'stopped' | 'unknown'> {
  if (os === 'windows') {
    const task = opts.taskName;
    if (!task) return 'unknown';
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -NonInteractive -Command "(Get-ScheduledTask -TaskName '${task}').State"`
      );
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
      const { stdout } = await execAsync(`systemctl is-active ${svc}`);
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
  const args = `--url ${opts.repoUrl} --token ${opts.token} --name ${opts.name} --labels ${labels} --unattended --replace`;

  if (os === 'windows') {
    const cmd = `"${opts.runnerPath}\\config.cmd" ${args}`;
    try {
      await execAsync(cmd);
    } catch (e) {
      throw new RunnerFleetError(
        ErrorCode.REGISTRATION_FAILED,
        `config.cmd failed for runner '${opts.name}'`,
        { runnerName: opts.name, cause: e }
      );
    }
  } else if (os === 'linux' || os === 'darwin') {
    const cmd = `"${opts.runnerPath}/config.sh" ${args}`;
    try {
      await execAsync(cmd);
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
