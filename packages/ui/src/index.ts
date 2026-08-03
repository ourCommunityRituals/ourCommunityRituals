export {
  tokens, primitives, semanticDark, semanticLight, structural,
  rootBlock, lightModeBlock, forceDarkBlock,
  uecDisplay, uecScan, uecBlock,
  type TokenName, type PrimitiveName,
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

// React component layer — Phase 3 bridge (OSE-538)
export {
  Button, Card, Loading, EmptyState, AccessDenied,
  Header, BottomNav, FormInput, Textarea, FormSelect,
  Checkbox, RadioGroup, FormGroup,
} from './react/index';
export type {
  ButtonProps, CardProps, LoadingProps,
  EmptyStateProps, AccessDeniedProps,
  HeaderProps, BottomNavProps,
  FormInputProps, TextareaProps, FormSelectProps, SelectOption,
  CheckboxProps, RadioGroupProps, RadioOption, FormGroupProps,
} from './react/index';
