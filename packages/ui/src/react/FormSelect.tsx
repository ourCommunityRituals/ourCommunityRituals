import type { ChangeEvent } from 'react';
import { FIELD_BASE } from './classNames';

export interface SelectOption {
  value: string;
  label: string;
  selected?: boolean;
}

export interface FormSelectProps {
  id: string;
  label: string;
  options: SelectOption[];
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  'data-testid'?: string;
}

const SELECT_BASE = `${FIELD_BASE} appearance-none`;

export function FormSelect({
  id,
  label,
  options,
  required = false,
  disabled = false,
  hint,
  error,
  onChange,
  'data-testid': testId,
}: FormSelectProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const cls = `${SELECT_BASE} ${error ? 'border-error' : 'border-border'}`;
  const defaultValue = options.find((o) => o.selected)?.value;

  return (
    <div className="flex flex-col gap-1.5" data-testid={testId}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required && (
          <span aria-hidden="true" className="text-danger ml-0.5">*</span>
        )}
      </label>
      <select
        id={id}
        name={id}
        className={cls}
        required={required}
        disabled={disabled}
        defaultValue={defaultValue}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        onChange={onChange}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <div id={hintId} className="text-xs text-text-muted">{hint}</div>
      )}
      {error && (
        <div id={errorId} className="text-xs text-error font-medium" role="alert">{error}</div>
      )}
    </div>
  );
}
