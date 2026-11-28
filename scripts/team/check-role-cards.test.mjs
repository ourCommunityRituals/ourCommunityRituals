// node --test scripts/team/
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { checkCard, MAX_CARD_BYTES, parseCard, sha12 } from './check-role-cards.mjs';

function rig(sourceText = 'rule one\n') {
  const ws = mkdtempSync(join(tmpdir(), 'cards-'));
  mkdirSync(join(ws, 'repoA'));
  writeFileSync(join(ws, 'repoA', 'AGENTS.md'), sourceText);
  return ws;
}

function card(ws, sha, body = '# Card\n') {
  const file = join(ws, 'card.md');
  writeFileSync(
    file,
    `---\nrole: tester\nversion: 1\nsources:\n  - repoA:AGENTS.md sha256:${sha}\n---\n\n${body}`,
  );
  return file;
}

test('a card whose source hash matches passes', () => {
  const ws = rig();
  const r = checkCard(card(ws, sha12('rule one\n')), { workspace: ws, strict: true });
  assert.equal(r.ok, true, JSON.stringify(r));
});

test('a changed source makes the card stale', () => {
  const ws = rig('rule one, changed\n');
  const r = checkCard(card(ws, sha12('rule one\n')), { workspace: ws, strict: false });
  assert.equal(r.ok, false);
  assert.equal(r.stale.length, 1);
});

test('a missing repo is unchecked, and fails only under --strict', () => {
  const ws = mkdtempSync(join(tmpdir(), 'cards-'));
  const file = card(ws, 'aaaaaaaaaaaa');
  assert.equal(checkCard(file, { workspace: ws, strict: false }).ok, true);
  assert.equal(checkCard(file, { workspace: ws, strict: true }).ok, false);
});

test('a missing source file in a present repo fails', () => {
  const ws = rig();
  const file = join(ws, 'card.md');
  writeFileSync(
    file,
    '---\nrole: tester\nversion: 1\nsources:\n  - repoA:GONE.md sha256:aaaaaaaaaaaa\n---\n',
  );
  assert.equal(checkCard(file, { workspace: ws, strict: false }).ok, false);
});

test('a card over the size limit fails', () => {
  const ws = rig();
  const r = checkCard(card(ws, sha12('rule one\n'), 'x'.repeat(MAX_CARD_BYTES)), {
    workspace: ws,
    strict: true,
  });
  assert.equal(r.ok, false);
  assert.match(r.errors.join(), /limit/);
});

test('front matter needs role, numeric version and sources', () => {
  assert.deepEqual(parseCard('# no front matter').errors, ['no front matter']);
  const p = parseCard('---\nversion: one\n---\n');
  assert.ok(p.errors.includes('missing role'));
  assert.ok(p.errors.includes('missing or non-numeric version'));
  assert.ok(p.errors.includes('no sources listed'));
});

test('a malformed source line is an error, not silently skipped', () => {
  const p = parseCard('---\nrole: t\nversion: 1\nsources:\n  - repoA:AGENTS.md\n---\n');
  assert.ok(p.errors.some((e) => e.startsWith('bad source line')));
});
