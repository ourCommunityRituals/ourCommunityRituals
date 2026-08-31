/**
 * @ocr/tokens — UEC v1.1 category colors
 *
 * LOCKED. Hue carries meaning here — green is access, coral is now, blue is
 * commerce — so these are theme-invariant AND brand-invariant. They do not flip
 * between light and dark, and an ourAirwaves client cannot repaint them: a
 * theatre restyling its site must not be able to turn the "enter" code red.
 * validateBrand() rejects any attempt to set one.
 *
 * Two values per code:
 *   display — UI surfaces, poster chrome, report badges
 *   scan    — WCAG AA on white; the QR module fill color
 *
 * Source of truth is uec-codes.ts in the OSE Worker. Changes originate there.
 */

export const uecDisplay = {
  '--uec-enter': '#2D6A4F', // green    · access          · white text
  '--uec-live': '#E07A5F', // coral    · now             · BLACK text
  '--uec-sponsor': '#1D3557', // blue     · commerce        · white text
  '--uec-archive': '#6C3483', // purple   · record          · white text
  '--uec-help': '#D4668E', // pink     · care            · white text
  '--uec-feedback': '#C4930A', // amber    · voice           · BLACK text
  '--uec-utility': '#4A4A4A', // charcoal · infrastructure  · white text
  '--uec-alert': '#B8960A', // yellow   · alert           · black text
  '--uec-staff': '#A00020', // deep red · staff-only      · white text
  '--uec-checkin': '#006B6B', // teal     · check-in        · white text
  '--uec-shop': '#1A4A48', // dark teal· commerce        · white text
} as const;

export const uecScan = {
  '--uec-enter-scan': '#1A6B2F',
  '--uec-live-scan': '#C04048',
  '--uec-sponsor-scan': '#1A3A8A',
  '--uec-archive-scan': '#5E1A9A',
  '--uec-help-scan': '#B01468',
  '--uec-feedback-scan': '#8A5A00',
  '--uec-utility-scan': '#2A2A3A',
  '--uec-alert-scan': '#B8960A',
  '--uec-staff-scan': '#A00020',
  '--uec-checkin-scan': '#006B6B',
  '--uec-shop-scan': '#1A4A48',
} as const;

export const uec = { ...uecDisplay, ...uecScan } as const;
