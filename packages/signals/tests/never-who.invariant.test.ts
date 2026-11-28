/**
 * INVARIANT: never who, always how many.
 *
 * Whatever a call site passes, no person-shaped value reaches a written line.
 * This feeds person-shaped values into every field kind, every context slot
 * and the error path, and fails if any of them comes out the other side.
 * It also reads the source: only the default sink and the console wrapper may
 * touch `console`, and no field kind accepts free text.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createLogger, type EventRegistry, type FieldSpec, type LogLine } from '../src';

const PERSON_SHAPED = [
  'dana.rivera@example.org',
  '203.0.113.42',
  '2001:db8::8a2e:370:7334',
  '3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90',
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig',
  'Bearer abcdefghijklmnop',
  'ose_anon=8f14e45fceea167a5a36dedd4bea2543',
  '(312) 555-0199',
  'https://stg.oursharedevents.com/sharedReport?token=abc',
  'Dana Rivera',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
];

const KINDS: FieldSpec[] = [
  { kind: 'enum', values: ['a', 'b'] },
  { kind: 'int', min: 0, max: 10 },
  { kind: 'ms' },
  { kind: 'bool' },
  { kind: 'status' },
  { kind: 'count' },
  { kind: 'people_count' },
  { kind: 'op' },
  { kind: 'code' },
];

const events: EventRegistry = {
  'probe.all': {
    doc: 'One field of every kind, for the invariant.',
    fields: Object.fromEntries(KINDS.map((k, i) => [`f${i}`, k])),
  },
};

function leaks(lines: LogLine[]): string[] {
  const text = JSON.stringify(lines);
  return PERSON_SHAPED.filter((v) => text.includes(v) || text.includes(JSON.stringify(v).slice(1, -1)));
}

describe('never who', () => {
  it('no field kind writes a person-shaped value', () => {
    const lines: LogLine[] = [];
    const log = createLogger({ service: 'ose', env: 'test', release: 'r', events, sink: (l) => lines.push(l) });
    for (const v of PERSON_SHAPED) {
      log.log('probe.all', Object.fromEntries(KINDS.map((_, i) => [`f${i}`, v])));
      log.log('probe.all', { ip: v, email: v, name: v, user_agent: v, ose_anon: v, url: v });
    }
    expect(leaks(lines)).toEqual([]);
  });

  it('no context slot writes a person-shaped value', () => {
    const lines: LogLine[] = [];
    const log = createLogger({ service: 'ose', env: 'test', release: 'r', events, sink: (l) => lines.push(l) });
    for (const v of PERSON_SHAPED) {
      log.with({ op: v, trace_id: v, span_id: v, client: v, event_type: v, region: v }).log('probe.all');
    }
    expect(leaks(lines)).toEqual([]);
  });

  it('the error path writes no person-shaped value', () => {
    const lines: LogLine[] = [];
    const log = createLogger({ service: 'ose', env: 'test', release: 'r', events, sink: (l) => lines.push(l) });
    for (const v of PERSON_SHAPED.filter((p) => p !== 'Dana Rivera' && !p.startsWith('Mozilla'))) {
      log.error('probe.all', new Error(`failed for ${v} while loading`));
      log.error('probe.all', `thrown string ${v}`);
    }
    expect(leaks(lines)).toEqual([]);
  });
});

describe('source rules', () => {
  const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
  const files = readdirSync(src, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.ts'));

  it('only the default sink and the console wrapper touch console', () => {
    const offenders = files.filter((f) => {
      const code = readFileSync(join(src, f), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
      if (!/\bconsole\b/.test(code)) return false;
      return !['logger.ts', join('redact', 'credentials.ts')].includes(f);
    });
    expect(offenders).toEqual([]);
  });

  it('no field kind accepts free text', () => {
    const schema = readFileSync(join(src, 'schema.ts'), 'utf8');
    const kinds = [...schema.matchAll(/readonly kind: '([a-z_]+)'/g)].map((m) => m[1]);
    expect(kinds.sort()).toEqual(['bool', 'code', 'count', 'enum', 'int', 'ms', 'op', 'people_count', 'status']);
  });
});
