/**
 * OurSharedEvents — component types.
 * Thirteen primitives from @ocr/ui (packages/ui/src/react/*), plus MapDetail,
 * which is an intentional addition for the touch-map surfaces.
 * Types are documentation here; they are not type-checked by the system.
 */
import type { ReactNode, ChangeEvent, MouseEvent } from 'react';

/** A UEC v1.1 category. Hue and glyph together carry the meaning — never hue alone. */
export type UecCategory =
  | 'enter' | 'checkin' | 'live' | 'alert' | 'staff' | 'help'
  | 'feedback' | 'sponsor' | 'archive' | 'shop' | 'utility';

export interface ButtonProps {
  children?: ReactNode;
  /** Used when `children` is absent. Names the outcome: "Make the poster", never "Submit". */
  label?: string;
  /** Renders an <a> that still measures and reads as a button. */
  href?: string;
  /** `primary` is 56px and 18px/700; `danger` is destructive only. */
  variant?: 'primary' | 'secondary' | 'danger';
  block?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}
export declare function Button(props: ButtonProps): JSX.Element;

export interface CardProps {
  title?: ReactNode;
  sub?: ReactNode;
  children?: ReactNode;
  className?: string;
}
export declare function Card(props: CardProps): JSX.Element;

export interface HeaderProps {
  title: ReactNode;
  /** Omit entirely on screens with no live/offline distinction. */
  live?: boolean;
}
export declare function Header(props: HeaderProps): JSX.Element;

export interface NavItem {
  href: string;
  /** Always present — a glyph never travels without its word. */
  label: string;
  icon?: ReactNode;
  active?: boolean;
}
export interface BottomNavProps { items: NavItem[] }
export declare function BottomNav(props: BottomNavProps): JSX.Element;

/** Shared by every field: hint shows before the mistake, error after blur. */
interface FieldBase {
  id: string;
  label: ReactNode;
  required?: boolean;
  disabled?: boolean;
  /** Renders under the label immediately. "Why we ask: it sets your corridor." */
  hint?: ReactNode;
  /** Three parts: what happened, why, what to do. Never a code. */
  error?: ReactNode;
}
export interface FormInputProps extends FieldBase {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}
export declare function FormInput(props: FormInputProps): JSX.Element;

export interface TextareaProps extends FieldBase {
  placeholder?: string;
  value?: string;
  rows?: number;
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void;
}
export declare function Textarea(props: TextareaProps): JSX.Element;

export interface SelectOption { value: string; label: string; selected?: boolean }
export interface FormSelectProps extends FieldBase {
  /** Ordered by likelihood, not alphabet. Pre-select the likely answer. */
  options: SelectOption[];
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
}
export declare function FormSelect(props: FormSelectProps): JSX.Element;

export interface CheckboxProps {
  id: string;
  /** Written as the state when checked. The whole row is the 48px target. */
  label: ReactNode;
  name?: string;
  value?: string;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;

export interface RadioOption { value: string; label: string; checked?: boolean; disabled?: boolean }
export interface RadioGroupProps {
  name: string;
  /** The legend is the question: "When is it?" */
  legend: ReactNode;
  options: RadioOption[];
  required?: boolean;
  error?: ReactNode;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
}
export declare function RadioGroup(props: RadioGroupProps): JSX.Element;

export interface FormGroupProps { legend: ReactNode; required?: boolean; children?: ReactNode }
export declare function FormGroup(props: FormGroupProps): JSX.Element;

export interface LoadingProps {
  /** Says what is happening, not that something is happening. */
  label?: string;
}
export declare function Loading(props: LoadingProps): JSX.Element;

export interface StateAction { label: string; href: string }
export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  message: ReactNode;
  /** Exactly one. An empty state without an action is a dead end. */
  action?: StateAction;
}
export declare function EmptyState(props: EmptyStateProps): JSX.Element;

export interface AccessDeniedProps {
  what?: string;
  icon?: ReactNode;
  message?: string;
  action?: StateAction;
}
export declare function AccessDenied(props: AccessDeniedProps): JSX.Element;

/** One thing you can do at an event. Each is a UEC category, so it arrives with a hue and a glyph. */
export interface EventRoute {
  /** The short path the QR encodes: '/public', '/donate', '/checkin'. */
  path: string;
  label: string;
  sub?: string;
  uec: UecCategory;
}
export interface MapDetailProps {
  name: string;
  when: string;
  where: string;
  /** Phase-dependent — the caller filters. A future event offers no check-in. */
  routes: EventRoute[];
  /** The armed route's path. Controlled; the component holds no state. */
  armed?: string;
  onArm?: (path: string) => void;
  onClose?: () => void;
  sponsor?: string;
}
export declare function MapDetail(props: MapDetailProps): JSX.Element;
