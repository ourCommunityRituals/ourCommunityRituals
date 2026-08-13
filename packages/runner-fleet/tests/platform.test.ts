import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Os } from '../src/types.ts';

// Capture every execFile invocation (file + argv) without running anything.
const calls: Array<{ file: string; args: string[] }> = [];
vi.mock('node:child_process', () => ({
  execFile: (...a: unknown[]) => {
    const cb = a[a.length - 1] as (e: unknown, r: unknown) => void;
    calls.push({ file: String(a[0]), args: (a[1] as string[]) ?? [] });
    cb(null, { stdout: 'Ready', stderr: '' });
  },
}));

const { detectOs, registerRunner, stopService } = await import('../src/platform.ts');

const VALID_OS: Os[] = ['windows', 'linux', 'darwin'];

describe('detectOs', () => {
  it('returns a valid Os value for the current platform', () => {
    expect(VALID_OS).toContain(detectOs());
  });
});

describe('platform security + terminal stop', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('registerRunner passes the token as a discrete argv element, never a shell string', async () => {
    await registerRunner(
      {
        runnerPath: 'C:/runners/2',
        repoUrl: 'https://github.com/ourCommunityRituals',
        token: 'SUPER_SECRET_TOKEN',
        name: 'BLOODRAVEN-2',
        labels: ['self-hosted', 'Windows', 'X64'],
      },
      'windows'
    );
    const c = calls.find((x) => x.file.includes('config.cmd'));
    expect(c, 'config.cmd should be invoked via execFile').toBeDefined();
    // token is a separate argv element after --token (no shell parsing/injection)
    expect(c!.args).toContain('--token');
    expect(c!.args).toContain('SUPER_SECRET_TOKEN');
    // and it is NOT baked into the executable/command string
    expect(c!.file).not.toContain('SUPER_SECRET_TOKEN');
    expect(c!.args.join(' ')).toContain('--replace');
  });

  it('stopService(windows) with a path issues a path-scoped terminal force-kill', async () => {
    await stopService({ taskName: 'GitHubActionsRunner-2', path: 'C:/runners/2' }, 'windows');
    const scripts = calls
      .filter((c) => c.file === 'powershell')
      .map((c) => c.args.join(' '));
    expect(scripts.some((s) => s.includes('Stop-ScheduledTask'))).toBe(true);
    expect(
      scripts.some((s) => s.includes('Stop-Process -Force') && s.includes('StartsWith')),
      'a wedged Listener/Worker must be force-killed, scoped by runner path'
    ).toBe(true);
  });

  it('stopService(windows) WITHOUT a path only stops the task (no kill)', async () => {
    await stopService({ taskName: 'GitHubActionsRunner-2' }, 'windows');
    const scripts = calls.filter((c) => c.file === 'powershell').map((c) => c.args.join(' '));
    expect(scripts.some((s) => s.includes('Stop-ScheduledTask'))).toBe(true);
    expect(scripts.some((s) => s.includes('Stop-Process'))).toBe(false);
  });
});
