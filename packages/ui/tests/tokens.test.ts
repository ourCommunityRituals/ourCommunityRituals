import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokens, rootBlock } from '../src/tokens';
import { contrastRatio } from '../src/contrast';

test('all required tokens are present', () => {
  const required = [
    '--bg', '--surface', '--border', '--text', '--text-muted',
    '--accent', '--accent-hover', '--live', '--danger',
    '--radius', '--radius-sm', '--tap-min', '--font',
  ];
  for (const t of required) assert.ok(t in tokens, `missing ${t}`);
});

test('accent is the WKRP orange, defined exactly once', () => {
  assert.equal(tokens['--accent'], '#D4954B');
  const occurrences = rootBlock().match(/--accent:/g) ?? [];
  assert.equal(occurrences.length, 1);
});

test('the two-red drift is resolved into distinct semantic tokens', () => {
  // Previously --live (#ff4136) and --error (#e74c3c) collided across files.
  assert.equal(tokens['--live'], '#ff4136');
  assert.equal(tokens['--danger'], '#e74c3c');
  assert.notEqual(tokens['--live'], tokens['--danger']);
});

test('tap target meets the 48px mobile-workability standard', () => {
  assert.equal(tokens['--tap-min'], '48px');
});

test('body text clears WCAG AAA on the base background', () => {
  assert.ok(contrastRatio(tokens['--text'], tokens['--bg']) >= 7,
    'text on bg should be >= 7:1');
});

test('muted text clears WCAG AA on the base background', () => {
  assert.ok(contrastRatio(tokens['--text-muted'], tokens['--bg']) >= 4.5,
    'muted text on bg should be >= 4.5:1');
});

test('primary button label (black on accent) clears WCAG AA', () => {
  assert.ok(contrastRatio('#000000', tokens['--accent']) >= 4.5,
    'black on accent should be >= 4.5:1');
});
