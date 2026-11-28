import { mkdtempSync, readFileSync, mkdirSync, existsSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appendLine, checkRunLine, LOCK_STALE_MS } from '../src/log.mjs';

const dir = () => mkdtempSync(join(tmpdir(), 'team-log-'));

describe('appendLine', () => {
  it('appends one line per object and releases the lock', () => {
    const f = join(dir(), 'log.ndjson');
    expect(appendLine(f, { a: 1 })).toBe(true);
    appendLine(f, { b: 'x y' });
    expect(readFileSync(f, 'utf8')).toBe('{"a":1}\n{"b":"x y"}\n');
    expect(existsSync(`${f}.lock`)).toBe(false);
  });
  it('waits while another writer holds a fresh lock, then gives up', () => {
    const f = join(dir(), 'log.ndjson');
    mkdirSync(`${f}.lock`);
    expect(() => appendLine(f, { a: 1 }, { tries: 3, waitMs: 1 })).toThrow(`could not lock ${f} after 3 tries`);
    expect(existsSync(f)).toBe(false);
  });
  it('takes over a stale lock left by a writer that died', () => {
    const f = join(dir(), 'log.ndjson');
    mkdirSync(`${f}.lock`);
    const old = (Date.now() - LOCK_STALE_MS - 5000) / 1000;
    utimesSync(`${f}.lock`, old, old);
    appendLine(f, { a: 1 }, { tries: 3, waitMs: 1 });
    expect(readFileSync(f, 'utf8')).toBe('{"a":1}\n');
  });
  it('does not take a lock that is exactly at the stale age', () => {
    const f = join(dir(), 'log.ndjson');
    mkdirSync(`${f}.lock`);
    const t = 1_000_000;
    const fs = { statSync: () => ({ mtimeMs: t - LOCK_STALE_MS }) };
    expect(() => appendLine(f, { a: 1 }, { tries: 2, waitMs: 1, now: () => t, fs })).toThrow(/could not lock/);
  });
  it('treats a lock that vanishes mid-check as fresh and retries', () => {
    const f = join(dir(), 'log.ndjson');
    let calls = 0;
    const fs = {
      mkdirSync: (p) => {
        calls += 1;
        if (calls === 1) throw Object.assign(new Error('x'), { code: 'EEXIST' });
        mkdirSync(p);
      },
      statSync: () => {
        throw new Error('gone');
      },
    };
    appendLine(f, { a: 1 }, { tries: 3, waitMs: 1, fs });
    expect(calls).toBe(2);
    expect(readFileSync(f, 'utf8')).toBe('{"a":1}\n');
  });
  it('rethrows any lock error but EEXIST', () => {
    const fs = { mkdirSync: () => { throw Object.assign(new Error('denied'), { code: 'EACCES' }); } };
    expect(() => appendLine(join(dir(), 'x'), {}, { fs })).toThrow('denied');
  });
  it('releases the lock even when the write fails', () => {
    const f = join(dir(), 'log.ndjson');
    const fs = { appendFileSync: () => { throw new Error('disk full'); } };
    expect(() => appendLine(f, {}, { fs })).toThrow('disk full');
    expect(existsSync(`${f}.lock`)).toBe(false);
  });
  it('refuses a value that would span two lines', () => {
    expect(() => appendLine(join(dir(), 'x'), { toJSON: () => undefined })).toThrow();
  });
});

describe('checkRunLine', () => {
  it('passes a sound line, with date or ts', () => {
    expect(checkRunLine({ date: '2026-11-28T20:05Z', role: 'tester', minutes: 0.1, cost_usd: null, found: 5 })).toEqual([]);
    expect(checkRunLine({ ts: '2026-11-28T19:52:00Z', role: 'lead' })).toEqual([]);
  });
  it('rejects a non-object', () => {
    expect(checkRunLine(null)).toEqual(['not an object']);
    expect(checkRunLine([])).toEqual(['not an object']);
    expect(checkRunLine('x')).toEqual(['not an object']);
  });
  it('needs a date and a role', () => {
    expect(checkRunLine({ role: '' })).toEqual(['date is missing or not a date', 'role is missing']);
    expect(checkRunLine({ date: 'soon', role: 'x' })).toEqual(['date is missing or not a date']);
    expect(checkRunLine({ date: 5, role: 'x' })).toEqual(['date is missing or not a date']);
  });
  it.each(['minutes', 'cost_usd', 'tokens', 'found', 'filed', 'confirmed', 'rejected', 'budget_minutes', 'tries'])(
    '%s must be a number of 0 or more',
    (k) => {
      const base = { date: '2026-11-28', role: 'x' };
      expect(checkRunLine({ ...base, [k]: 0 })).toEqual([]);
      expect(checkRunLine({ ...base, [k]: -1 })).toEqual([`${k} must be a number of 0 or more`]);
      expect(checkRunLine({ ...base, [k]: '3' })).toEqual([`${k} must be a number of 0 or more`]);
      expect(checkRunLine({ ...base, [k]: Infinity })).toEqual([`${k} must be a number of 0 or more`]);
    },
  );
});
