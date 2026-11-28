// The team's append-only files (run log, scores) live on a shared network
// folder that several sessions write at once. A plain `>>` from two of them
// cut a line in half on 28 Nov 2026. appendLine takes a lock first: mkdir is
// atomic, so only one writer holds `<file>.lock` at a time.
//
// checkRunLine is the run log's line contract, shared by the guard, trust and
// cost modules so they read the same fields.

import { appendFileSync, mkdirSync, rmdirSync, statSync } from 'node:fs';

export const LOCK_STALE_MS = 60_000;

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * Append one JSON object as one line, under a lock.
 * @param {string} file
 * @param {object} obj
 * @param {{tries?: number, waitMs?: number, fs?: object, now?: () => number}} [opts] fs and now are for tests
 */
export function appendLine(file, obj, opts = {}) {
  const { tries = 50, waitMs = 100, now = Date.now } = opts;
  const fs = { appendFileSync, mkdirSync, rmdirSync, statSync, ...opts.fs };
  const line = JSON.stringify(obj);
  if (line.includes('\n')) throw new Error('a log line must be one line');
  const lock = `${file}.lock`;
  for (let i = 0; i < tries; i++) {
    try {
      fs.mkdirSync(lock);
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      // A lock older than LOCK_STALE_MS was left by a writer that died; take it.
      let age = 0;
      try {
        age = now() - fs.statSync(lock).mtimeMs;
      } catch {
        age = 0;
      }
      if (age > LOCK_STALE_MS) {
        try {
          fs.rmdirSync(lock);
        } catch {
          /* another writer took it first */
        }
      } else {
        sleep(waitMs);
      }
      continue;
    }
    try {
      fs.appendFileSync(file, `${line}\n`);
      return true;
    } finally {
      fs.rmdirSync(lock);
    }
  }
  throw new Error(`could not lock ${file} after ${tries} tries`);
}

const NUMERIC = ['minutes', 'cost_usd', 'tokens', 'found', 'filed', 'confirmed', 'rejected', 'budget_minutes', 'tries'];

/** Errors in one run-log line (empty when it is sound). */
export function checkRunLine(row) {
  const errors = [];
  if (!row || typeof row !== 'object' || Array.isArray(row)) return ['not an object'];
  const date = row.date ?? row.ts;
  if (typeof date !== 'string' || Number.isNaN(Date.parse(date))) errors.push('date is missing or not a date');
  if (typeof row.role !== 'string' || !row.role) errors.push('role is missing');
  for (const k of NUMERIC) {
    const v = row[k];
    if (v === undefined || v === null) continue;
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) errors.push(`${k} must be a number of 0 or more`);
  }
  return errors;
}
