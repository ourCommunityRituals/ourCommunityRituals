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
    '.sponsor-panel-main', '.btn-static',
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
        // inherit / transparent are keywords, not colours: they add none of their own.
        expect(d[1], `${sel} ${d[0]}`).toMatch(/var\(--|^none$|^0$|^inherit$|^transparent$|^\d+px solid var\(--/);
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
    expect(rule('.sponsor-panel-id img')).toMatch(/height:72px;width:auto;max-width:min\(45%,200px\)/);
  });
});

// OSE-1991 (owner 2026-11-11): "Sponsored by" takes less room, the sponsor's
// thumbnail and name take more, the thumbnail and name link to the sponsor's own
// site, and a printed sheet shows the same cards with nothing to tap.
// Born-red: run against 9634fca (40px logo, 1rem name, flex column, no
// .sponsor-panel-main, no .btn-static, no print block). Each test went red.
describe('componentStyles — sponsor panel weight, sponsor link, printed cards (OSE-1991)', () => {
  const css = componentStyles.replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = (sel: string, from = css): string => {
    for (const before of ['\n', '}', '{']) {
      const at = from.indexOf(`${before}${sel}{`);
      if (at === -1) continue;
      const start = at + before.length + sel.length + 1;
      return from.slice(start, from.indexOf('}', start));
    }
    return '';
  };
  const px = (v: string) => (v.endsWith('rem') ? parseFloat(v) * 16 : parseFloat(v));
  const printBlock = (() => {
    const at = css.indexOf('@media print{\n.detail-list{');
    return at === -1 ? '' : css.slice(at, css.indexOf('\n}', at));
  })();

  it('the label is one tight line at the text floor, lighter than the name', () => {
    const label = rule('.sponsor-panel-label');
    expect(label).toContain('font-size:var(--text-min)');
    expect(label).toContain('line-height:1.2');
    expect(label).toContain('font-weight:500');
    expect(rule('.sponsor-panel')).toMatch(/gap:4px/);
  });

  it('the thumbnail is at least 64px tall and the name at least 20px', () => {
    const img = /(?:^|;)height:(\d+px)/.exec(rule('.sponsor-panel-id img'));
    expect(px(img![1])).toBeGreaterThanOrEqual(64);
    const name = /font-size:([\d.]+(?:rem|px))/.exec(rule('.sponsor-panel-name'));
    expect(px(name![1])).toBeGreaterThanOrEqual(20);
  });

  it('sponsors sit side by side where there is room; the label spans the row', () => {
    expect(rule('.sponsor-panel')).toContain('display:grid');
    expect(rule('.sponsor-panel')).toContain('repeat(auto-fit,');
    expect(rule('.sponsor-panel-label')).toContain('grid-column:1/-1');
  });

  it('a linked sponsor is a full tap target with a visible focus ring and no colour of its own', () => {
    expect(rule('.sponsor-panel-main')).toContain('color:inherit');
    expect(rule('.sponsor-panel-main')).toContain('text-decoration:none');
    expect(rule('.sponsor-panel-id')).toContain('min-height:var(--tap-min)');
    expect(rule('a.sponsor-panel-main:focus-visible')).toMatch(/outline:3px solid var\(--accent\)/);
  });

  it('a static button looks like a button and takes no pointer', () => {
    expect(rule('.btn-static')).toContain('pointer-events:none');
    expect(rule('.btn-static')).toContain('cursor:default');
  });

  it('on paper: cards two-up, no fills, the page ink, no tap height', () => {
    expect(printBlock).not.toBe('');
    expect(rule('.detail-list', printBlock)).toContain('grid-auto-flow:column');
    expect(rule('.detail-card', printBlock)).toContain('background:transparent');
    expect(rule('.sponsor-panel-block', printBlock)).toContain('background:transparent');
    expect(rule('.detail-card-actions .btn', printBlock)).toContain('min-height:0');
    expect(printBlock).toMatch(/\.sponsor-panel-name[^{]*\{color:inherit\}/);
    expect(printBlock).toMatch(/\.detail-card-main[^{]*\{color:inherit\}/);
    expect(printBlock).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
  });

  it('on paper: a card keeps its text and buttons on one row, and every sponsor shares one row', () => {
    // A second row of either costs the sheet's artwork its room (OSE-1991, measured).
    expect(rule('.detail-card', printBlock)).toContain('flex-wrap:nowrap');
    expect(rule('.detail-card-actions', printBlock)).toContain('flex:0 1 auto');
    expect(rule('.sponsor-panel', printBlock)).toContain('flex-wrap:wrap');
    expect(rule('.sponsor-panel-label', printBlock)).toContain('flex:0 0 100%');
    expect(rule('.sponsor-panel-block', printBlock)).toMatch(/flex:1 1 0;min-width:0/);
  });

  it('still tier-blind: no rule in the panel or its print block keys on a tier', () => {
    for (const r of css.split('}').filter((x) => x.includes('sponsor-panel'))) {
      expect(r).not.toMatch(/tier|platinum|gold|silver|bronze/i);
    }
  });

  it('the sponsor panel is tier-blind: no rule keys on a tier', () => {
    const panelRules = componentStyles.replace(/\/\*[\s\S]*?\*\//g, '').split('}').filter((r) => r.includes('sponsor-panel'));
    expect(panelRules.length).toBeGreaterThan(5);
    for (const r of panelRules) expect(r).not.toMatch(/tier|title|platinum|gold|silver|bronze/i);
  });
});
