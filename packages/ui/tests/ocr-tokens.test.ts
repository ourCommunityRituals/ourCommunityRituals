import { describe, it, expect } from 'vitest';
import { primitives, semanticDark, semanticLight, UI_FROM_OCR } from '../src/tokens';
import { ocrPrimitives, ocrRoles } from '../src/generated/ocr-tokens';

/**
 * @ocr/ui takes its colors from @ocr/tokens, the OCR-level design system, via
 * the generated src/generated/ocr-tokens.ts. Whether that file is current is
 * checked in the hub by `npm run check:tokens` (it needs packages/tokens); this
 * suite needs only packages/ui, so it also runs where a spoke's CI copies the
 * package on its own.
 */
describe('@ocr/ui follows @ocr/tokens', () => {
  const P = primitives as Record<string, string>;

  it('every generated primitive is in the palette with the same value', () => {
    for (const [k, v] of Object.entries(ocrPrimitives)) expect(P[k], k).toBe(v);
  });

  it('every mapped role resolves to the base brand role in both modes', () => {
    for (const [ui, role] of Object.entries(UI_FROM_OCR)) {
      expect((semanticDark as Record<string, string>)[ui], ui).toBe(`var(${ocrRoles.ose!.dark[role]})`);
      expect((semanticLight as Record<string, string>)[ui], ui).toBe(`var(${ocrRoles.ose!.light[role]})`);
    }
  });

  it('the base is charcoal and creme', () => {
    expect(semanticDark['--bg']).toBe('var(--ocr-charcoal-950)');
    expect(semanticLight['--bg']).toBe('var(--ocr-creme-050)');
    expect(P['--ocr-charcoal-950']).toBe('#1A1918');
    expect(P['--ocr-creme-050']).toBe('#F4EEE2');
  });

  it('dark danger is the shipping #F08585', () => {
    expect(semanticDark['--danger']).toBe('var(--ocr-red-350)');
    expect(P['--ocr-red-350']).toBe('#F08585');
  });
});
