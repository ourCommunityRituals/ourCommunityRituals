/**
 * @ocr/ui — the shared UI layer for OSE and its spokes.
 *
 * NATIVE JS ONLY (owner decision, 2026-09-05). This package exports functions
 * that return HTML STRINGS, plus the stylesheet and design tokens that style
 * them. No framework, no build step, no bundler — the same shape the workers
 * already produce, which is what makes adoption drop-in.
 *
 * The main entry is native JS only. The hub also carries an optional React
 * layer (`@ocr/ui/react`) and a Tailwind preset (`@ocr/ui/tailwind`) as separate
 * entry points; nothing served imports them, and the native partials here never
 * depend on them.
 */
export {
  tokens,
  primitives,
  semanticDark,
  semanticLight,
  structural,
  rootBlock,
  lightModeBlock,
  forceDarkBlock,
  uecDisplay,
  uecScan,
  uecBlock,
  brandThemes,
  brandBlock,
  brandBlocks,
  type BrandTheme,
  type TokenName,
  type PrimitiveName,
} from './tokens';
export { componentStyles } from './styles';
export { ocrStylesheet, serveCss, styleTag } from './css';
export { esc, escUrl } from './esc';
export { contrastRatio } from './contrast';
export {
  header,
  footer,
  bottomNav,
  button,
  card,
  loading,
  emptyState,
  accessDenied,
  formInput,
  textarea,
  formSelect,
  checkbox,
  radioGroup,
  formGroup,
  page,
  type NavItem,
  type ButtonOpts,
  type EmptyStateOpts,
  type FooterOpts,
  type FooterLink,
  type FormInputOpts,
  type TextareaOpts,
  type FormSelectOpts,
  type CheckboxOpts,
  type RadioGroupOpts,
  type FormGroupOpts,
  type PageOpts,
} from './partials';
export { checkTemplate, checkAll, type DriftFinding } from './contract';
export {
  BRAND_CUSTOMIZABLE,
  BRAND_LOCKED,
  DESIGNATION,
  validateBrandOverride,
  resolveBrandPalette,
  brandContrastPairs,
  checkBrandContrast,
  type CustomizableToken,
  type BrandOverrideViolation,
  type ThemeMode,
  type ContrastPair,
  type ContrastFailure,
} from './brand';
