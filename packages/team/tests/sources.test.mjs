import { describe, expect, it } from 'vitest';
import {
  bullets,
  cells,
  citedInvariants,
  parseAgent,
  parseInvariants,
  parseMemoryDecisions,
  parseNames,
  parseRoleCard,
  parseSway,
  section,
  splitFrontMatter,
} from '../src/sources.mjs';
import { AGENT, BRIEF, CARD, INVARIANTS, MEMORY, NAMES } from './fixtures.mjs';

describe('splitFrontMatter', () => {
  it('splits front matter from body', () => {
    expect(splitFrontMatter('---\na: 1\n---\nbody')).toEqual({ front: 'a: 1', body: 'body' });
  });
  it('returns null front when there is none or it is unclosed', () => {
    expect(splitFrontMatter('body').front).toBeNull();
    expect(splitFrontMatter('---\na: 1\nbody').front).toBeNull();
    expect(splitFrontMatter('---\na: 1\nbody').body).toBe('---\na: 1\nbody');
  });
});

describe('section and bullets', () => {
  it('stops at the next heading and joins continuation lines', () => {
    const body = '## A\n- one\n  more\n- two\n\n## B\n- three';
    expect(bullets(section(body, 'A'))).toEqual(['one more', 'two']);
    expect(bullets(section(body, 'B'))).toEqual(['three']);
    expect(section(body, 'C')).toEqual([]);
  });
  it('ignores indented lines before any bullet and blank indented lines', () => {
    expect(bullets(['  stray', '- a', '   ', '- b'])).toEqual(['a', 'b']);
  });
});

describe('parseRoleCard', () => {
  const c = parseRoleCard(CARD);
  it('reads role, version, question and lane', () => {
    expect(c.role).toBe('sre');
    expect(c.version).toBe('2');
    expect(c.question).toBe('does CI tell the truth?');
    expect(c.lane).toBe('pipeline health.');
  });
  it('reads sources', () => {
    expect(c.sources).toEqual([
      { repo: 'ourSharedEvents', path: 'AGENTS.md' },
      { repo: 'ourSharedEvents', path: 'scripts/ci/classify-ci-failure.mjs' },
    ]);
  });
  it('reads only the pre-read rules, continuation joined', () => {
    expect(c.rules).toHaveLength(3);
    expect(c.rules[1]).toBe('A failed run: start with `classify-ci-failure.mjs`. It names the root job and sets aside cascades.');
  });
  it('reads may and may not', () => {
    expect(c.may).toEqual(['file a Linear story.']);
    expect(c.mayNot).toEqual(['merge, deploy.']);
  });
  it('returns an empty card without front matter', () => {
    const e = parseRoleCard('# no front matter\n## Rules, pre-read\n- x');
    expect(e.role).toBeNull();
    expect(e.rules).toEqual([]);
  });
});

describe('parseAgent', () => {
  it('reads name, tools and model', () => {
    expect(parseAgent(AGENT)).toEqual({ name: 'team-sre', tools: ['Read', 'Grep', 'Glob', 'Bash'], model: 'sonnet' });
  });
  it('has no tools without a tools line or front matter', () => {
    expect(parseAgent('---\nname: x\n---\n').tools).toEqual([]);
    expect(parseAgent('nothing')).toEqual({ name: null, tools: [], model: null });
  });
});

describe('parseInvariants', () => {
  it('reads each entry under invariants: and stops at the next top-level key', () => {
    expect(parseInvariants(INVARIANTS)).toEqual([
      { id: 5, name: 'security_not_tiered', title: 'Security is never tier-gated', status: 'live', group: 'security_isolation' },
      { id: 8, name: 'audit', title: 'Audit', status: 'partial', group: 'security_isolation' },
    ]);
  });
  it('returns nothing without an invariants key', () => {
    expect(parseInvariants('a: 1\n')).toEqual([]);
  });
});

describe('tables', () => {
  it('splits cells', () => {
    expect(cells('| a | b c |')).toEqual(['a', 'b c']);
  });
  it('maps names to roles, skipping header, separator and pending rows', () => {
    expect(parseNames(NAMES)).toEqual({ Egg: 'SRE', Ana: 'SRE', Ghost: 'security junior' });
  });
  it('reads the sway table up to its end', () => {
    expect(parseSway(BRIEF)).toEqual([
      { domain: 'CI, pipeline trust', lead: ['Egg'], strong: ['Ana', 'research fellow'], hold: [] },
      { domain: 'Privacy and data', lead: ['Egg'], strong: [], hold: ['Egg'] },
      { domain: "Matt's time", lead: ['home companion'], strong: [], hold: [] },
    ]);
  });
  it('returns no sway rows without the header', () => {
    expect(parseSway('| a | b |')).toEqual([]);
  });
});

describe('parseMemoryDecisions', () => {
  const m = parseMemoryDecisions(MEMORY);
  it('keeps decisions that cite a message, ids deduplicated', () => {
    expect(m.decisions.map((d) => d.cmsg)).toEqual([['cmsg_01AAAAAAAAAAAAAAAAAAAAAAAAAA'], ['cmsg_01BBBBBBBBBBBBBBBBBBBBBBBBBB']]);
  });
  it('flags a decision with no id, and ignores lines that only mention Matt', () => {
    expect(m.unverified).toEqual(['Matt chose routines, no id given.']);
  });
});

describe('citedInvariants', () => {
  it('finds #n and ignores longer numbers', () => {
    expect(citedInvariants('rule [#1 #7] and #14, not PR #102 or OSE#1626')).toEqual([1, 7, 14]);
    expect(citedInvariants('none')).toEqual([]);
  });
});
