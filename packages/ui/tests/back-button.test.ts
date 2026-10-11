/**
 * Back and the outlined button, shared by every product (OSE-1689).
 *
 * ourSharedEvents built Back as its own component (lib/back-button.ts, #927,
 * #928): the last control on every public page, outlined and full width. It
 * moves here so the sponsor card, every OSE page and ourWKRP draw the same one.
 *
 * Rule, unchanged from OSE: with a referrer and some tab history, Back goes
 * back; opened fresh (a QR code, a shared link) or with no script, it opens the
 * fallback link. In a draft preview it is shown but switched off.
 */
import { describe, it, expect } from 'vitest';
import { backButton, button } from '../src/partials';
import { componentStyles } from '../src/styles';

describe('the outlined button', () => {
  it('button() has an outline variant', () => {
    expect(button({ label: 'Back', variant: 'outline', block: true })).toMatch(
      /class="btn btn-outline btn-block"/
    );
  });

  it('the stylesheet draws it: accent border and text, transparent fill', () => {
    const rule = componentStyles.match(/\.btn-outline\{([^}]*)\}/);
    expect(rule, '.btn-outline rule').not.toBeNull();
    expect(rule![1]).toContain('background:transparent');
    expect(rule![1]).toContain('color:var(--accent)');
    expect(rule![1]).toMatch(/border:[^;]*solid var\(--accent\)/);
  });
});

describe('backButton()', () => {
  it('is an outlined, full-width link to the fallback, in a labelled nav', () => {
    const html = backButton({ fallbackHref: '/events' });
    expect(html).toMatch(/<nav class="back-nav" aria-label="Back">/);
    expect(html).toMatch(/<a class="btn btn-outline btn-block" data-testid="page-back" href="\/events">Back<\/a>/);
  });

  it('goes back only with a referrer and tab history, otherwise follows the link', () => {
    const html = backButton({ fallbackHref: '/events' });
    expect(html).toContain('document.referrer');
    expect(html).toContain('window.history.length<2');
    expect(html).toContain('window.history.back()');
    expect(html).not.toMatch(/onclick=/);
  });

  it('carries the page nonce on its script when given one', () => {
    expect(backButton({ fallbackHref: '/', nonce: 'abc123' })).toMatch(/<script nonce="abc123">/);
    expect(backButton({ fallbackHref: '/' })).toMatch(/<script>/);
  });

  it('says Volver in Spanish', () => {
    const html = backButton({ fallbackHref: '/', lang: 'es' });
    expect(html).toMatch(/aria-label="Volver"/);
    expect(html).toMatch(/>Volver<\/a>/);
  });

  it('switched off in a preview: no link, no script', () => {
    const html = backButton({ fallbackHref: '/events', inert: true });
    expect(html).toMatch(/aria-disabled="true"/);
    expect(html).not.toMatch(/href=/);
    expect(html).not.toMatch(/<script/);
  });

  it('escapes what it is given and refuses a javascript: fallback', () => {
    const html = backButton({ fallbackHref: 'javascript:alert(1)', testid: '"><x' });
    expect(html).not.toMatch(/javascript:/);
    expect(html).not.toContain('"><x');
  });

  it('takes its own test id', () => {
    expect(backButton({ fallbackHref: '/', testid: 'sponsor-card-back' })).toContain(
      'data-testid="sponsor-card-back"'
    );
  });
});
