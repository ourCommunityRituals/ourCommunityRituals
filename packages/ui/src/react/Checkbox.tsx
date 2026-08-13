import type { ChangeEvent } from 'react';
import { OPTION_CONTROL, optionLabelClass } from './classNames';

export interface CheckboxProps {
  id: string;
  label: string;
  name?: string;
  value?: string;
  checked?: boolean;
  required?: boolean;
  disabled?: boolean;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  'data-testid'?: string;
}

export function Checkbox({
  id,
  label,
  name,
  value = 'on',
  checked,
  required = false,
  disabled = false,
  onChange,
  'data-testid': testId,
}: CheckboxProps) {
  return (
    <label className={optionLabelClass(disabled)} data-testid={testId}>
      <input
        type="checkbox"
        id={id}
        name={name ?? id}
        value={value}
        defaultChecked={checked}
        required={required}
        disabled={disabled}
        onChange={onChange}
        className={`${OPTION_CONTROL} rounded-sm`}
      />
      {label}
    </label>
  );
}
