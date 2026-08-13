import type { ChangeEvent } from 'react';
import { OPTION_CONTROL, optionLabelClass } from './classNames';

export interface RadioOption {
  value: string;
  label: string;
  checked?: boolean;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  legend: string;
  options: RadioOption[];
  required?: boolean;
  error?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  'data-testid'?: string;
}

export function RadioGroup({
  name,
  legend,
  options,
  required = false,
  error,
  onChange,
  'data-testid': testId,
}: RadioGroupProps) {
  const errorId = `${name}-error`;

  return (
    <fieldset className="flex flex-col gap-2" data-testid={testId}>
      <legend className="text-sm font-medium text-text mb-1">{legend}</legend>
      {options.map((opt) => (
        <label key={opt.value} className={optionLabelClass(opt.disabled)}>
          <input
            type="radio"
            name={name}
            value={opt.value}
            defaultChecked={opt.checked}
            required={required}
            disabled={opt.disabled}
            onChange={onChange}
            aria-describedby={error ? errorId : undefined}
            className={OPTION_CONTROL}
          />
          {opt.label}
        </label>
      ))}
      {error && (
        <div id={errorId} className="text-xs text-error font-medium mt-1" role="alert">
          {error}
        </div>
      )}
    </fieldset>
  );
}
