import { describe, it, expect } from 'vitest';
import { RunnerFleetError, ErrorCode, RECOVERABLE } from '../src/errors.ts';

describe('RunnerFleetError', () => {
  it('sets name, code, message', () => {
    const e = new RunnerFleetError(ErrorCode.TOKEN_EXPIRED, 'token gone');
    expect(e.name).toBe('RunnerFleetError');
    expect(e.code).toBe('TOKEN_EXPIRED');
    expect(e.message).toBe('token gone');
  });

  it('is recoverable for transient codes', () => {
    expect(new RunnerFleetError(ErrorCode.TOKEN_EXPIRED, '').recoverable).toBe(true);
    expect(new RunnerFleetError(ErrorCode.NETWORK_DROP, '').recoverable).toBe(true);
    expect(new RunnerFleetError(ErrorCode.REGISTRATION_LOST, '').recoverable).toBe(true);
    expect(new RunnerFleetError(ErrorCode.SERVICE_START_FAILED, '').recoverable).toBe(true);
  });

  it('is not recoverable for permanent codes', () => {
    expect(new RunnerFleetError(ErrorCode.CONFIG_INVALID, '').recoverable).toBe(false);
    expect(new RunnerFleetError(ErrorCode.TOKEN_INVALID, '').recoverable).toBe(false);
    expect(new RunnerFleetError(ErrorCode.PLATFORM_UNSUPPORTED, '').recoverable).toBe(false);
  });

  it('carries optional runnerName', () => {
    const e = new RunnerFleetError(ErrorCode.REGISTRATION_LOST, 'lost', {
      runnerName: 'BLOODRAVEN-3',
    });
    expect(e.runnerName).toBe('BLOODRAVEN-3');
  });

  it('wraps a cause', () => {
    const cause = new Error('network timeout');
    const e = new RunnerFleetError(ErrorCode.NETWORK_DROP, 'down', { cause });
    expect(e.cause).toBe(cause);
  });

  it('RECOVERABLE set is consistent with recoverable property', () => {
    for (const code of Object.values(ErrorCode)) {
      const e = new RunnerFleetError(code, '');
      expect(e.recoverable).toBe(RECOVERABLE.has(code));
    }
  });
});
