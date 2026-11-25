/**
 * The evaluator's fail-open paths and tier detection, which the adapter spec
 * does not reach.
 *
 * Written after the first mutation run of this package (stryker.conf.mjs):
 * 31 of evaluator.ts's 50 mutants had no test at all. Every one sat in the
 * catch blocks (a storage error must read as ON and tell the observability
 * sink, never throw at the caller) or in detectCurrentTier. Each case below
 * was watched failing with its fault written in.
 */
import { describe, expect, it } from 'vitest';
import { MemoryAdapter } from '../src/adapters/memory.js';
import { applyTier, detectCurrentTier, isFeatureEnabled, resolveFlags } from '../src/evaluator.js';
import { ALL_FLAG_KEYS } from '../src/generated/flag-keys.js';
import { TIER_PRESETS } from '../src/generated/presets.js';
import type { ObservabilityEvent, StorageAdapter } from '../src/types.js';

class BrokenStore extends Error {}

/** An adapter whose every read throws, as a database that is down would. */
function brokenAdapter(error: unknown = new BrokenStore('down')): StorageAdapter {
  const fail = () => Promise.reject(error);
  return {
    id: 'broken',
    getEventFlag: fail,
    getGlobalFlag: fail,
    resolveAll: fail,
    listFlags: fail,
    setFlag: fail,
    removeEventFlag: fail,
    batchApplyTier: fail,
  };
}

function sink() {
  const events: ObservabilityEvent[] = [];
  return { events, observability: (e: ObservabilityEvent) => void events.push(e) };
}

describe('isFeatureEnabled fails open', () => {
  it('reads ON when the store throws, and reports it with the flag key', async () => {
    const s = sink();
    expect(await isFeatureEnabled(brokenAdapter(), 'forms.register', 'evt_1', s)).toBe(true);
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({
      kind: 'fail_open',
      adapter_id: 'broken',
      level: 'warn',
      flag_key: 'forms.register',
      error_class: 'BrokenStore',
    });
    expect(Number.isNaN(Date.parse(s.events[0]!.ts))).toBe(false);
  });

  it('names a thrown non-Error by its type', async () => {
    const s = sink();
    await isFeatureEnabled(brokenAdapter('nope'), 'forms.register', undefined, s);
    expect(s.events[0]?.error_class).toBe('string');
  });

  it('still reads ON with no sink to report to', async () => {
    expect(await isFeatureEnabled(brokenAdapter(), 'forms.register')).toBe(true);
  });

  it('skips the event lookup when no event is named', async () => {
    const a = new MemoryAdapter();
    await a.setFlag('forms.register', false, 'event', '');
    expect(await isFeatureEnabled(a, 'forms.register', '')).toBe(true);
  });
});

describe('resolveFlags fails open', () => {
  it('reads every flag ON when the store throws, and reports it without a flag key', async () => {
    const s = sink();
    const out = await resolveFlags(brokenAdapter(), 'evt_1', s);
    expect(Object.keys(out).sort()).toEqual([...ALL_FLAG_KEYS].sort());
    expect(Object.values(out).every((v) => v === true)).toBe(true);
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ kind: 'fail_open', adapter_id: 'broken' });
    expect('flag_key' in s.events[0]!).toBe(false);
  });
});

describe('detectCurrentTier', () => {
  it('names each tier whose preset is applied', async () => {
    for (const tier of ['free', 'mid', 'enterprise'] as const) {
      const a = new MemoryAdapter();
      await applyTier(a, tier);
      expect(await detectCurrentTier(a)).toBe(tier);
    }
  });

  it('reads free when the flags match no preset', async () => {
    const a = new MemoryAdapter();
    await applyTier(a, 'enterprise');
    const key = ALL_FLAG_KEYS.find((k) => TIER_PRESETS.enterprise[k] && TIER_PRESETS.mid[k] !== TIER_PRESETS.enterprise[k]);
    expect(key).toBeDefined();
    await a.setFlag(key!, false);
    expect(await detectCurrentTier(a)).toBe('free');
  });

  it('falls through to free for an empty store, where every flag reads ON and no preset is all ON', async () => {
    expect(await detectCurrentTier(new MemoryAdapter())).toBe('free');
  });

  it('applyTier reports the tier and the number of flags it set', async () => {
    const a = new MemoryAdapter();
    expect(await applyTier(a, 'mid')).toEqual({ tier: 'mid', applied: ALL_FLAG_KEYS.length });
  });
});
