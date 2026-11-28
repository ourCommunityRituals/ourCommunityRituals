import { describe, expect, it } from 'vitest';
import { autoMergeAllowed, record, rung, RUNGS, FILE_MIN_REVIEWED, PR_MIN_REVIEWED, PR_MIN_DAYS } from '../src/trust.mjs';

const day = (n) => new Date(Date.UTC(2026, 10, 1 + n)).toISOString();
const graduated = [
  { set: 'sre-v1', score: 100, date: day(0), version: 1 },
  { set: 'sre-v2', score: 95, date: day(1), version: 2 },
];
const runs = (n, { confirmed = 1, rejected = 0, spanDays = 0 } = {}) =>
  Array.from({ length: n }, (_, i) => ({ date: day(Math.round((spanDays * i) / Math.max(n - 1, 1))), role: 'sre', confirmed, rejected }));

describe('record', () => {
  it('sums reviews and measures the span', () => {
    expect(record([
      { date: day(0), confirmed: 3, rejected: 1 },
      { ts: day(10), confirmed: 1 },
      { date: 'bad' },
      {},
    ])).toEqual({ confirmed: 4, rejected: 1, reviewed: 5, hitRate: 0.8, days: 10 });
  });
  it('has no hit rate and no span with nothing reviewed', () => {
    expect(record([])).toEqual({ confirmed: 0, rejected: 0, reviewed: 0, hitRate: null, days: 0 });
  });
  it('takes the earliest and latest date in any order', () => {
    expect(record([{ date: day(5) }, { date: day(1) }, { date: day(9) }, { date: day(3) }]).days).toBe(8);
  });
});

describe('rung', () => {
  it('names five rungs', () => {
    expect(RUNGS).toHaveLength(5);
  });
  it('is 0 until evals graduate', () => {
    const r = rung({ runs: runs(50), evals: graduated.slice(0, 1) });
    expect(r).toMatchObject({ rung: 0, name: 'supervised', standing: 'training' });
    expect(r.why).toBe('evals: training (needs 90+ on two set versions)');
  });
  it('is 1 with too few reviews or a low hit rate', () => {
    expect(FILE_MIN_REVIEWED).toBe(5);
    expect(rung({ runs: runs(4), evals: graduated })).toMatchObject({ rung: 1, why: 'needs 5+ reviewed findings at 80%+ (has 4, 100%)' });
    expect(rung({ runs: [], evals: graduated }).why).toBe('needs 5+ reviewed findings at 80%+ (has 0, no reviews)');
    const low = [...runs(7), ...runs(3, { confirmed: 0, rejected: 1 })]; // 7 of 10 = 70%
    expect(rung({ runs: low, evals: graduated }).rung).toBe(1);
  });
  it('is 2 at 80%+ on 5+, short of the draft-PR bar', () => {
    const r = rung({ runs: [...runs(4), ...runs(1, { confirmed: 0, rejected: 0 }), { date: day(0), confirmed: 0, rejected: 1 }, ...runs(1)], evals: graduated });
    expect(r).toMatchObject({ rung: 2, name: 'file' });
    expect(r.why).toBe('needs 15+ reviewed at 90%+ over 28+ days (has 6, 83%, 0 days)');
    expect(rung({ runs: runs(5), evals: graduated }).rung).toBe(2);
  });
  it('needs all of 15 reviews, 90% and 28 days for a draft PR', () => {
    expect([PR_MIN_REVIEWED, PR_MIN_DAYS]).toEqual([15, 28]);
    expect(rung({ runs: runs(14, { spanDays: 30 }), evals: graduated }).rung).toBe(2);
    expect(rung({ runs: runs(15, { spanDays: 27 }), evals: graduated }).rung).toBe(2);
    const ninety = [...runs(18, { spanDays: 30 }), ...runs(2, { confirmed: 0, rejected: 1 })]; // 18/20 = 90%
    expect(rung({ runs: ninety, evals: graduated }).rung).toBe(3);
    const below = [...runs(17, { spanDays: 30 }), ...runs(2, { confirmed: 0, rejected: 1 })]; // 17/19 < 90%
    expect(rung({ runs: below, evals: graduated }).rung).toBe(2);
    expect(rung({ runs: runs(15, { spanDays: 28 }), evals: graduated })).toMatchObject({ rung: 3, name: 'draft PR' });
  });
  it('holds at 2 while an eval alarm is open', () => {
    const alarmed = [...graduated, { set: 'sre-v2', score: 90, date: day(2), version: 2, planted_found: 'no' }, { set: 'sre-v2', score: 90, date: day(3), version: 2, planted_found: 'no' }];
    const r = rung({ runs: runs(20, { spanDays: 40 }), evals: alarmed });
    expect(r.rung).toBe(2);
    expect(r.why).toBe(`eval alarm: planted bug missed twice in a row (to ${day(3)})`);
  });
  it("needs the owner's yes and Code Owners on for rung 4", () => {
    const strong = { runs: runs(20, { spanDays: 40 }), evals: graduated };
    expect(rung(strong).why).toBe("auto-merge needs the owner's yes for this role");
    expect(rung({ ...strong, codeOwnersOn: true }).rung).toBe(3);
    expect(rung({ ...strong, ownerApproved: true })).toMatchObject({ rung: 3, why: 'auto-merge waits on Code Owners review being on' });
    expect(rung({ ...strong, ownerApproved: true, codeOwnersOn: true })).toMatchObject({ rung: 4, name: 'auto-merge (low risk)' });
  });
  it('falls back down when the record gets worse', () => {
    const worse = [...runs(20, { spanDays: 40 }), ...runs(10, { confirmed: 0, rejected: 1 })];
    expect(rung({ runs: worse, evals: graduated, ownerApproved: true, codeOwnersOn: true }).rung).toBe(1);
  });
});

describe('autoMergeAllowed', () => {
  it('allows plain low-risk paths', () => {
    expect(autoMergeAllowed(['docs/testing/notes.md', 'packages/ui/src/esc.ts'])).toEqual({ ok: true, blocked: [] });
  });
  it('blocks nothing-to-merge', () => {
    expect(autoMergeAllowed([])).toEqual({ ok: false, blocked: [] });
  });
  it.each([
    '.github/workflows/ci.yml',
    'CLAUDE.md',
    'workers/x/CLAUDE.md',
    'AGENTS.md',
    'SKILL.md',
    'docs/adr/ADR-014.md',
    'ocr-docs-brain/data-edges.yaml',
    'docs/standards/OCR_STANDARD_x.md',
    'docs/OCR_VISION.md',
    'workers/oursharedevents/migrations/0099_x.sql',
    'workers/oursharedevents/migrations-forms/0001.sql',
    'docs/security/threats.md',
    '.claude/agents/team-sre.md',
    'team/tools.json',
    'wrangler.toml',
    'workers/x/wrangler.jsonc',
    'package.json',
    'pnpm-lock.yaml',
    'workers/x/package-lock.json',
    'src/lib/pii.ts',
    'src/lib/forms-db.ts',
    'src/lib/count-floor.ts',
    'src/auth/session.ts',
    'src/handlers/Admin.ts',
    'src/secret-store.ts',
    'src/token.ts',
    'web/privacy.html',
  ])('never auto-merges %s', (p) => {
    expect(autoMergeAllowed(['README.md', p])).toEqual({ ok: false, blocked: [p] });
  });
  it('does not block look-alikes', () => {
    expect(autoMergeAllowed(['docs/github/notes.md', 'xCLAUDE.md.bak', 'docs/adr-notes.md', 'team/tools.md']).ok).toBe(true);
  });
});

describe('edges found by mutation testing', () => {
  it('a bad date first does not poison the span', () => {
    expect(record([{ date: 'bad' }, { date: day(2) }, { date: day(6) }]).days).toBe(4);
  });
  it('exactly 80% on 5 reviews reaches rung 2', () => {
    const r = [...runs(4), { date: day(0), confirmed: 0, rejected: 1 }];
    expect(rung({ runs: r, evals: graduated }).rung).toBe(2);
  });
  it('wraps its why for each rung in words', () => {
    expect(rung({ runs: runs(20, { spanDays: 40 }), evals: graduated, ownerApproved: true, codeOwnersOn: true }).why).toBe(
      "earned, with the owner's yes and Code Owners on",
    );
  });
  it.each([
    ['root-level migrations', 'migrations/0001.sql', false],
    ['root-level security', 'security/x.md', false],
    ['a .github folder further down', 'docs/x.github/a.md', true],
    ['CLAUDE.md with a suffix', 'CLAUDE.md.bak', true],
    ['AGENTS.md with a suffix', 'AGENTS.md.old', true],
    ['SKILL.md with a suffix', 'SKILL.md.old', true],
    ['the vision with a suffix', 'docs/OCR_VISION.md.old', true],
    ['a tools.json elsewhere', 'other/team/tools.json', true],
    ['tools.json with a suffix', 'team/tools.json.bak', true],
    ['wrangler with a suffix', 'wrangler.toml.bak', true],
    ['wrangler.json', 'wrangler.json', false],
    ['package.json with a suffix', 'package.json.orig', true],
    ['a word ending in migrations', 'docs/notmigrations-x/a.md', true],
    ['a word ending in security', 'docs/cybersecurity/a.md', true],
  ])('%s: %s → ok %s', (_why, p, ok) => {
    expect(autoMergeAllowed([p]).ok).toBe(ok);
  });
});
