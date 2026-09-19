import { describe, it, expect } from 'vitest';
import { componentStyles } from '../src/styles';
import { accessDenied, emptyState } from '../src/partials';
import { rulesFor } from './_css';

/**
 * Static equivalents of the assertions stranded in e2e/shared-ui.spec.ts.
 *
 * That spec needs a live BASE_URL against a deployed worker this repo neither builds
 * nor deploys, has no playwright dependency and no config, and is invoked by nothing.
 * Three of its four assertions do not actually need a browser — they are properties of
 * the stylesheet and of the server-rendered partials, both of which are right here.
 * Porting them turns dead coverage into live coverage; the fourth genuinely needs an
 * origin and stays deferred (docs/decisions/ADR-e2e-shared-ui-deferred.md).
 *
 * This is not a replacement for rendered verification — computed layout, real tap
 * geometry and cache headers still need a browser against a deployment. It is the part
 * that can be true today instead of never.
 */

describe('tap targets — the 48px floor is declared, not hoped for', () => {
  /**
   * Every class a finger lands on. `--tap-min` is 48px, above WCAG 2.5.5 AAA's 44px,
   * because this product is built for readers aged 50-75 and size is the cheapest
   * accommodation there is.
   */
  const TOUCHABLE = [
    '.btn', '.btn-link', '.nav-item', '.filter-chip', '.list-item',
    '.checkbox-label', '.radio-option', '.source-badge', '.view-btn',
    '.sort-select', '.attr-btn',
  ];

  for (const sel of TOUCHABLE) {
    it(`${sel} declares a minimum height`, () => {
      const matched = rulesFor(componentStyles, sel);
      expect(matched.length, `${sel} must exist in componentStyles`).toBeGreaterThan(0);
      expect(
        matched.map((r) => r.body).join(';'),
        `${sel} is touchable and must declare min-height (var(--tap-min) or >=44px). ` +
          `An undersized target is the most common way an unsteady hand mis-taps.`,
      ).toMatch(/min-height:\s*(var\(--tap-min\)|4[4-9]px|[5-9]\d px|[5-9]\dpx)/);
    });
  }
});

describe('no dead ends — every gated surface offers a next step', () => {
  it('accessDenied renders a title, a reason and an action', () => {
    const html = accessDenied({ what: 'The organizer dashboard' });
    expect(html, 'a gate needs a heading').toMatch(/<h3>/);
    expect(html, 'a gate needs a reason in prose').toMatch(/<p>/);
    expect(
      html,
      'a gate without a way forward is a dead end — the single most common place a ' +
        'non-confident user stops',
    ).toMatch(/<a[^>]+href=/);
  });

  it('emptyState renders an action when one is given', () => {
    const html = emptyState({
      icon: '📅',
      title: 'No events yet',
      message: 'When you make your first event it will show up here.',
      action: { label: 'Make your first event', href: '/admin/new' },
    });
    expect(html).toContain('No events yet');
    expect(html).toMatch(/<a[^>]+href="\/admin\/new"/);
  });

  it('gated copy never exposes a status code', () => {
    const html = accessDenied({ what: 'Sponsor settings' });
    expect(
      html,
      'there is no 403 in this product’s vocabulary — a gate is a direction, not an error',
    ).not.toMatch(/\b(40[0-9]|50[0-9]|forbidden|unauthorized)\b/i);
  });
});
