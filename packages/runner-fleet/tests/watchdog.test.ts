import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Watchdog } from '../src/watchdog.ts';
import type { FleetConfig, RunnerState } from '../src/types.ts';
import type { GitHubClient } from '../src/github.ts';
import type { TokenManager } from '../src/token.ts';
import { RunnerFleetError, ErrorCode } from '../src/errors.ts';

vi.mock('../src/platform.ts', () => ({
  detectOs: () => 'linux',
  stopService: vi.fn().mockResolvedValue(undefined),
  startService: vi.fn().mockResolvedValue(undefined),
  getServiceState: vi.fn().mockResolvedValue('running'),
  registerRunner: vi.fn().mockResolvedValue(undefined),
}));

const BASE_CFG: FleetConfig = {
  githubToken: 'tok',
  repoOwner: 'org',
  repoName: 'repo',
  runners: [{ name: 'RUNNER-1', path: '/runners/1', serviceName: 'runner1' }],
  maxRestartAttempts: 1,
};

function makeGh(status: 'online' | 'offline'): GitHubClient {
  return {
    listRunners: vi.fn().mockResolvedValue([
      { id: 42, name: 'RUNNER-1', os: 'linux', status, busy: false },
    ]),
    fetchRegistrationToken: vi.fn(),
    getQueueDepth: vi.fn().mockResolvedValue(0),
    deleteRunner: vi.fn(),
  } as unknown as GitHubClient;
}

function makeTokens(): TokenManager {
  return {
    refresh: vi.fn().mockResolvedValue({
      token: 'reg-tok',
      expiresAt: new Date(Date.now() + 3_600_000),
    }),
    getToken: vi.fn(),
    prefetch: vi.fn(),
    stop: vi.fn(),
  } as unknown as TokenManager;
}

describe('Watchdog.tick()', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('emits all_healthy when runner is online', async () => {
    const state = new Map<string, RunnerState>();
    const w = new Watchdog(BASE_CFG, makeGh('online'), makeTokens(), state);
    const events: string[] = [];
    w.onEvent((e) => events.push(e.type));
    await w.tick();
    expect(events).toContain('all_healthy');
    expect(events).not.toContain('runner_offline');
  });

  it('emits runner_offline when runner is offline', async () => {
    vi.useFakeTimers();
    const state = new Map<string, RunnerState>();
    const w = new Watchdog(BASE_CFG, makeGh('offline'), makeTokens(), state);
    const events: string[] = [];
    w.onEvent((e) => events.push(e.type));
    const tickPromise = w.tick();
    await vi.runAllTimersAsync();
    await tickPromise;
    expect(events).toContain('runner_offline');
  });

  it('attempts restart on first offline, emits restart_succeeded', async () => {
    vi.useFakeTimers();
    const state = new Map<string, RunnerState>();
    const w = new Watchdog(BASE_CFG, makeGh('offline'), makeTokens(), state);
    const events: string[] = [];
    w.onEvent((e) => events.push(e.type));
    const tickPromise = w.tick();
    await vi.runAllTimersAsync();
    await tickPromise;
    expect(events).toContain('restart_attempted');
    expect(events).toContain('restart_succeeded');
    expect(events).not.toContain('re_register_attempted');
  });

  it('escalates to re-register after maxRestartAttempts exhausted', async () => {
    const state = new Map<string, RunnerState>();
    const cfg = BASE_CFG.runners[0]!;
    state.set('RUNNER-1', {
      config: cfg,
      status: 'offline',
      githubId: null,
      busy: false,
      lastSeenOnlineAt: null,
      restartAttempts: 1, // already at max (maxRestartAttempts = 1)
      lastRecovery: null,
      lastRecoveryAt: null,
      lastErrorCode: null,
    });
    const w = new Watchdog(BASE_CFG, makeGh('offline'), makeTokens(), state);
    const events: string[] = [];
    w.onEvent((e) => events.push(e.type));
    await w.tick();
    expect(events).toContain('re_register_attempted');
    expect(events).toContain('re_register_succeeded');
  });

  it('skips cycle silently when GitHub API is unreachable', async () => {
    const state = new Map<string, RunnerState>();
    const gh = {
      listRunners: vi
        .fn()
        .mockRejectedValue(new RunnerFleetError(ErrorCode.NETWORK_DROP, 'down')),
    } as unknown as GitHubClient;
    const w = new Watchdog(BASE_CFG, gh, makeTokens(), state);
    const events: string[] = [];
    w.onEvent((e) => events.push(e.type));
    await expect(w.tick()).resolves.toBeUndefined();
    expect(events).toHaveLength(0);
  });

  it('updates state.lastSeenOnlineAt when runner comes online', async () => {
    const state = new Map<string, RunnerState>();
    const w = new Watchdog(BASE_CFG, makeGh('online'), makeTokens(), state);
    await w.tick();
    const s = state.get('RUNNER-1');
    expect(s?.lastSeenOnlineAt).toBeInstanceOf(Date);
    expect(s?.restartAttempts).toBe(0);
  });
});
