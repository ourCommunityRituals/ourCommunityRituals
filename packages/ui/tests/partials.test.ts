import { test } from 'node:test';
import assert from 'node:assert/strict';
import { page, header, bottomNav, button, emptyState, accessDenied } from '../src/partials';
import { ocrStylesheet, styleTag } from '../src/css';

test('page() emits one document that links the shared stylesheet, no inline <style>', () => {
  const html = page({ title: 'Dashboard', body: '<p>hi</p>' });
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<link rel="stylesheet" href="\/ui.css">/);
  assert.equal((html.match(/<style/g) ?? []).length, 0, 'no inline style blocks');
  assert.equal((html.match(/<link rel="stylesheet"/g) ?? []).length, 1, 'linked exactly once');
});

test('the shared stylesheet is a single deduplicated string', () => {
  // One :root only — the whole point of the extraction.
  assert.equal((ocrStylesheet.match(/:root/g) ?? []).length, 1);
  assert.match(styleTag(), /^<style>/);
});

test('user text is escaped everywhere (XSS)', () => {
  const evil = '"><script>alert(1)</script>';
  assert.doesNotMatch(header({ title: evil }), /<script>/);
  assert.doesNotMatch(button({ label: evil }), /<script>/);
  assert.doesNotMatch(emptyState({ title: evil, message: evil }), /<script>/);
});

test('javascript: URLs are neutralised in hrefs', () => {
  const b = button({ label: 'x', href: 'javascript:alert(1)' });
  assert.doesNotMatch(b, /javascript:/);
});

test('buttons render as real tap targets via the token', () => {
  // The class carries min-height:var(--tap-min); assert the class is applied.
  assert.match(button({ label: 'Go' }), /class="btn btn-primary"/);
  assert.match(ocrStylesheet, /\.btn\{[^}]*min-height:var\(--tap-min\)/);
});

test('no dead ends: access-denied always offers a next step', () => {
  const denied = accessDenied();
  assert.match(denied, /class="empty-state"/);
  assert.match(denied, /class="btn btn-primary"/, 'must include an action button');
  assert.match(denied, /href="\/connect"/);
});

test('bottomNav marks the active item', () => {
  const nav = bottomNav([
    { href: '/a', label: 'A', icon: '🅰️', active: true },
    { href: '/b', label: 'B', icon: '🅱️' },
  ]);
  assert.match(nav, /class="nav-item active" href="\/a"/);
  assert.match(nav, /class="nav-item" href="\/b"/);
});
