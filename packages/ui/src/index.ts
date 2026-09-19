export {
  tokens, primitives, semanticDark, semanticLight, structural,
  rootBlock, lightModeBlock, forceDarkBlock,
  uecDisplay, uecScan, uecBlock,
  brandThemes, brandBlock, brandBlocks,
  type TokenName, type PrimitiveName, type BrandTheme,
} from './tokens';
export { componentStyles } from './styles';
export { ocrStylesheet, serveCss, styleTag } from './css';
export { esc, escUrl } from './esc';
export { contrastRatio } from './contrast';
export {
  header,
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
  type FormInputOpts,
  type TextareaOpts,
  type FormSelectOpts,
  type CheckboxOpts,
  type RadioGroupOpts,
  type FormGroupOpts,
  type PageOpts,
} from './partials';
export { checkTemplate, checkAll, type DriftFinding } from './contract';
export { ocrTailwindPreset } from './tailwind';

// There is no React layer. The FE is built with native JS: `partials.ts` renders the
// same thirteen components as HTML strings, and `styles.ts` styles them.
//
// The React layer was removed 2026-09-19. It had zero consumers (referenced only by this
// barrel and the package's own `./react` export), react-dom was never installed so it
// could not be rendered, and its 23 "tests" asserted `typeof X === 'function'` and
// nothing else — deferring behaviour to a Playwright spec that has no runner and has
// never executed. Net behavioural coverage was zero. `partials.ts` has 32 tests that
// assert real rendered HTML including XSS escaping, because a string is trivially
// assertable with no renderer, no DOM and no browser.
