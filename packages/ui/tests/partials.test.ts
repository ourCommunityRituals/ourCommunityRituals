import { describe, it, expect } from 'vitest';
import { page, header, bottomNav, button, emptyState, accessDenied } from '../src/partials';
import { ocrStylesheet, styleTag } from '../src/css';

describe('page()', () => {
  it('emits a full document linking the shared stylesheet, no inline <style>', () => {
    const html = page({ title: 'Dashboard', body: '<p>hi</p>' });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain('<link rel="stylesheet" href="/ui.css">');
    expect((html.match(/<style/g) ?? []).length).toBe(0);
    expect((html.match(/<link rel="stylesheet"/g) ?? []).length).toBe(1);
  });
});

describe('stylesheet', () => {
  it('rootBlock emits two :root blocks (Tier 1 + Tier 2), not one', () => {
    // We no longer enforce exactly one :root — the 3-tier split uses two.
    expect((ocrStylesheet.match(/:root/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('styleTag wraps in <style>', () => {
    expect(styleTag()).toMatch(/^<style>/);
  });

  it('stylesheet contains light mode media query (automatic, system preference)', () => {
    expect(ocrStylesheet).toContain('prefers-color-scheme: light');
  });

  it('stylesheet contains [data-theme="light"] forced override (Claude Design + manual toggle)', () => {
    expect(ocrStylesheet).toContain('[data-theme="light"]');
  });

  it('stylesheet contains [data-theme="dark"] forced override (lock dark regardless of system)', () => {
    expect(ocrStylesheet).toContain('[data-theme="dark"]');
  });

  it('stylesheet contains prefers-reduced-motion block (WCAG 2.3.3)', () => {
    expect(ocrStylesheet).toContain('prefers-reduced-motion');
  });

  it('stylesheet contains :focus-visible rules on interactive components (WCAG 2.4.11)', () => {
    expect(ocrStylesheet).toContain(':focus-visible');
    expect(ocrStylesheet).toMatch(/\.btn:focus-visible/);
    expect(ocrStylesheet).toMatch(/\.nav-item:focus-visible/);
    expect(ocrStylesheet).toMatch(/\.input:focus-visible/);
  });

  it('[data-theme="light"] block re-maps all semantic tokens to light values', () => {
    expect(ocrStylesheet).toMatch(/\[data-theme="light"\][\s\S]*?--bg[\s\S]*?--accent/);
  });

  it('[data-theme="dark"] block re-maps all semantic tokens to dark values', () => {
    expect(ocrStylesheet).toMatch(/\[data-theme="dark"\][\s\S]*?--bg[\s\S]*?--accent/);
  });
});

describe('XSS safety', () => {
  const evil = '"><script>alert(1)</script>';

  it('header() escapes user text', () => {
    expect(header({ title: evil })).not.toMatch(/<script>/);
  });
  it('button() escapes label', () => {
    expect(button({ label: evil })).not.toMatch(/<script>/);
  });
  it('emptyState() escapes title and message', () => {
    expect(emptyState({ title: evil, message: evil })).not.toMatch(/<script>/);
  });
  it('button() neutralises javascript: hrefs', () => {
    expect(button({ label: 'x', href: 'javascript:alert(1)' })).not.toMatch(/javascript:/);
  });
});

describe('tap targets', () => {
  it('btn class carries min-height:var(--tap-min)', () => {
    expect(button({ label: 'Go' })).toMatch(/class="btn btn-primary"/);
    expect(ocrStylesheet).toMatch(/\.btn\{[^}]*min-height:var\(--tap-min\)/);
  });
});

describe('accessDenied()', () => {
  it('always offers a next step — no dead ends', () => {
    const denied = accessDenied();
    expect(denied).toMatch(/class="empty-state"/);
    expect(denied).toMatch(/class="btn btn-primary"/);
    expect(denied).toMatch(/href="\/connect"/);
  });
});

describe('bottomNav()', () => {
  it('marks the active item and leaves others unmarked', () => {
    const nav = bottomNav([
      { href: '/a', label: 'A', icon: '🅰️', active: true },
      { href: '/b', label: 'B', icon: '🅱️' },
    ]);
    expect(nav).toMatch(/class="nav-item active" href="\/a"/);
    expect(nav).toMatch(/class="nav-item" href="\/b"/);
  });
});
