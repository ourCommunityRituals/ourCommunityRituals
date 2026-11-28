// Edge cases found by mutation testing: anchors, whitespace and optional parts.
import { describe, expect, it } from 'vitest';
import {
  bullets,
  cells,
  parseAgent,
  parseInvariants,
  parseMemoryDecisions,
  parseNames,
  parseRoleCard,
  parseSway,
  section,
  splitFrontMatter,
} from '../src/sources.mjs';

describe('front matter and sections, exact edges', () => {
  it('keeps the body exactly after the closing line', () => {
    expect(splitFrontMatter('---\nx\n---\n\nbody\n')).toEqual({ front: 'x', body: '\nbody\n' });
  });
  it('matches a section heading only as a whole trimmed line', () => {
    expect(section('## A more\n- x\n  ## A  \n- y', 'A')).toEqual(['- y']);
    expect(section('## A', 'A')).toEqual([]);
  });
  it('keeps the bullet text after "- " and joins with one space', () => {
    expect(bullets(['- a', '  b c'])).toEqual(['a b c']);
    expect(bullets(['-a', '- b'])).toEqual(['b']);
  });
});

describe('parseRoleCard, exact edges', () => {
  const card = (front, body = '') => parseRoleCard(`---\n${front}\n---\n${body}`);
  it('ignores source lines with the wrong indent, a bad hash, or trailing text', () => {
    const c = card([
      'role: x',
      ' - r:a.md sha256:aaaaaaaaaaaa',
      '  - r:b.md sha256:aaaaaaaaaaa',
      '  - r:c.md sha256:aaaaaaaaaaaa extra',
      'x  - r:d.md sha256:aaaaaaaaaaaa',
      '  - r:e.md sha256:aaaaaaaaaaaa',
    ].join('\n'));
    expect(c.sources).toEqual([{ repo: 'r', path: 'e.md' }]);
  });
  it('reads role and version only at line start and trims them', () => {
    const c = card('xrole: no\nrole: sre  \nversion: 3');
    expect(c.role).toBe('sre');
    expect(c.version).toBe('3');
  });
  it('reads question and lane only at line start, trimmed, and leaves them null when absent', () => {
    const c = card('role: x', 'say **Question:** no\n**Question:** yes?  \n**Lane:** here  \n');
    expect(c.question).toBe('yes?');
    expect(c.lane).toBe('here');
    const none = card('role: x', 'say **Lane:** no\n');
    expect(none.question).toBeNull();
    expect(none.lane).toBeNull();
  });
  it('sorts "May:" and "May not:" and ignores other bullets', () => {
    const c = card('role: x', '## May and may not\n\n- May:  a\n- May not:  b\n- Maybe: c\n');
    expect(c.may).toEqual(['a']);
    expect(c.mayNot).toEqual(['b']);
  });
});

describe('parseAgent, exact edges', () => {
  it('reads keys only at line start, trims values and drops empty tools', () => {
    const a = parseAgent('---\nxname: no\nname: team-x  \ntools: Read ,  Bash,,\nmodel: opus \n---\n');
    expect(a).toEqual({ name: 'team-x', tools: ['Read', 'Bash'], model: 'opus' });
  });
});

describe('parseInvariants, exact edges', () => {
  it('needs invariants: at line start and alone', () => {
    expect(parseInvariants('x_invariants:\n  - id: 1\n')).toEqual([]);
    expect(parseInvariants('invariants: []\n  - id: 1\n')).toEqual([]);
    expect(parseInvariants('a: 1\ninvariants:   \n  - id: 1\n')).toHaveLength(1);
  });
  it('reads ids only as "  - id: N" alone on the line, any number of digits', () => {
    const y = 'invariants:\n  - id: 12\n   - id: 3\n  - id: 4 x\n  - id: 25  \n    - id: 6\n';
    expect(parseInvariants(y).map((i) => i.id)).toEqual([12, 25]);
  });
  it('reads fields only at four spaces, trimmed, quotes stripped only when wrapping', () => {
    const y = 'invariants:\n  - id: 1\n    title: "A "b" c"  \n     status: no\n    status: live\n    group: say "x"\n';
    expect(parseInvariants(y)).toEqual([{ id: 1, name: null, title: 'A "b" c', status: 'live', group: 'say "x"' }]);
  });
  it('ignores fields before the first entry', () => {
    expect(parseInvariants('invariants:\n    title: stray\n  - id: 1\n')).toEqual([{ id: 1, name: null, title: null, status: null, group: null }]);
  });
});

describe('tables, exact edges', () => {
  it('strips only the outer pipes', () => {
    expect(cells(' | a | | b | ')).toEqual(['a', '', 'b']);
    expect(cells('a | b')).toEqual(['a', 'b']);
  });
  it('treats only all-dash rows as separators, colons allowed', () => {
    expect(parseNames('| Name | Role |\n| :--- | ---: |\n| A | tester |\n| -- | x |\n| B | --- |')).toEqual({ A: 'tester', '--': 'x', B: '---' });
  });
  it('skips rows not starting with a pipe and rows without a role', () => {
    expect(parseNames('  | A | tester |\nB | sre |\n| C | |\n| D |')).toEqual({ A: 'tester' });
  });
  it('reads the sway header only at line start and keeps reading indented rows', () => {
    expect(parseSway('x | Domain | Lead |\n| a | b |')).toEqual([]);
    const t = '|  Domain  |  Lead  | Strong | Hold |\n|---|---|---|---|\n  | D | A , B | None | - |\n| E | - | Advise | C |\nend';
    expect(parseSway(t)).toEqual([
      { domain: 'D', lead: ['A', 'B'], strong: [], hold: [] },
      { domain: 'E', lead: [], strong: [], hold: ['C'] },
    ]);
  });
});

describe('parseMemoryDecisions, exact edges', () => {
  it('needs a word-bounded Matt and one of the decision forms', () => {
    const m = parseMemoryDecisions([
      '- Mattress note, decided.',
      '- Matt said yes.',
      '- (Matt: later)',
      '- (Matt, 28 Nov) chose',
      '- Matt: keep it',
      '- Matthew decided',
      '- Matt (said) x',
      '- Matt decidedly not',
    ].join('\n'));
    expect(m.unverified).toEqual(['Matt said yes.', '(Matt: later)', '(Matt, 28 Nov) chose', 'Matt: keep it']);
    expect(m.decisions).toEqual([]);
  });
});
