import { describe, it, expect } from 'vitest';
import { componentStyles } from '../src/styles';

// OSE-1326 — the uniform management-card anatomy. Opt-in (.card--sectioned) so
// existing .card (padding:14px) consumers are untouched. Born-red: none of these
// selectors existed in componentStyles before this story.
describe('componentStyles — uniform Card anatomy (OSE-1326)', () => {
  const CARD_ANATOMY = [
    '.card--sectioned',
    '.card-header',
    '.card-title',
    '.card-action',
    '.card-body',
    '.card--collapsed .card-body',
    '.card--locked',
  ];

  for (const sel of CARD_ANATOMY) {
    it(`defines ${sel}`, () => {
      expect(componentStyles).toContain(sel);
    });
  }

  it('sectioned card zeroes its own padding (header/body pad instead)', () => {
    expect(componentStyles).toMatch(/\.card--sectioned\{padding:0\}/);
  });

  it('card header meets the >=56px height (touch-target floor)', () => {
    expect(componentStyles).toMatch(/\.card-header\{[^}]*min-height:56px/);
  });

  it('the base .card is unchanged — still padding:14px (no regression for existing cards)', () => {
    expect(componentStyles).toMatch(/\.card\{[^}]*padding:14px\}/);
  });
});

// OSE-1327 — combined-footer statement classes.
describe('componentStyles — combined-footer statement (OSE-1327)', () => {
  for (const sel of ['.ocr-footer-statement', '.ocr-footer-flag', '.ocr-footer-say']) {
    it(`defines ${sel}`, () => {
      expect(componentStyles).toContain(sel);
    });
  }

  it('hides the statement in print so the print footer stays compact', () => {
    expect(componentStyles).toContain('.ocr-footer-statement{display:none}');
  });
});

// OSE-1825 / OSE-1826 — detail card, share row and sponsor panel, moved here from
// the ourSharedEvents digital poster so the spoke carries no stylesheet of its own.
// Born-red: none of these selectors existed in componentStyles before.
describe('componentStyles — detail card, share row, sponsor panel (OSE-1825, OSE-1826)', () => {
  /** The declaration block of the first rule whose selector is exactly `sel`. */
  const rule = (sel: string): string => {
    for (const before of ['\n', '}']) {
      const at = componentStyles.indexOf(`${before}${sel}{`);
      if (at === -1) continue;
      const start = at + before.length + sel.length + 1;
      return componentStyles.slice(start, componentStyles.indexOf('}', start));
    }
    return '';
  };

  const SELECTORS = [
    '.detail-list', '.detail-card', '.detail-card-text', '.detail-card-label', '.detail-card-main',
    '.detail-card-sub', '.detail-card-actions', '.detail-card-actions .btn',
    '.share-row>.btn', '.share-chips', '.share-chip', '.share-chip:hover', '.share-status',
    '.sponsor-panel', '.sponsor-panel-label', '.sponsor-panel-block', '.sponsor-panel-header',
    '.sponsor-panel-id', '.sponsor-panel-id img', '.sponsor-panel-name', '.sponsor-panel-text',
  ];
  for (const sel of SELECTORS) {
    it(`defines ${sel}`, () => {
      expect(rule(sel)).not.toBe('');
    });
  }

  it('every new rule takes its colours from tokens (no hex, rgb or named colour)', () => {
    for (const sel of SELECTORS) {
      const body = rule(sel);
      expect(body, sel).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i);
      for (const d of body.matchAll(/(?:^|;)(?:color|background|border(?:-color)?):([^;]*)/g)) {
        expect(d[1], `${sel} ${d[0]}`).toMatch(/var\(--|^none$|^0$|^\d+px solid var\(--/);
      }
    }
  });

  it('a share chip is a full tap target (min-height from --tap-min) with a visible focus ring', () => {
    expect(rule('.share-chip')).toContain('min-height:var(--tap-min)');
    expect(componentStyles).toMatch(/\.share-chip:focus-visible\{outline:3px solid var\(--accent\)/);
  });

  it('a detail card action keeps the .btn tap floor (it never sets a smaller min-height)', () => {
    expect(rule('.btn')).toContain('min-height:var(--tap-min)');
    expect(rule('.detail-card-actions .btn')).not.toMatch(/min-height|height:/);
  });

  it('the sponsor header image holds one 3:1 shape and the logo one box, for every sponsor', () => {
    expect(rule('.sponsor-panel-header')).toContain('aspect-ratio:3/1');
    expect(rule('.sponsor-panel-header')).toContain('width:100%');
    expect(rule('.sponsor-panel-id img')).toMatch(/height:40px;width:auto;max-width:140px/);
  });

  it('the sponsor panel is tier-blind: no rule keys on a tier', () => {
    const panelRules = componentStyles.replace(/\/\*[\s\S]*?\*\//g, '').split('}').filter((r) => r.includes('sponsor-panel'));
    expect(panelRules.length).toBeGreaterThan(5);
    for (const r of panelRules) expect(r).not.toMatch(/tier|title|platinum|gold|silver|bronze/i);
  });
});
