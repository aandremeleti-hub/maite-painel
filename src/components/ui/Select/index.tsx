import { forwardRef, useId } from 'react';
import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './styles.module.css';

export interface ISelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface ISelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: ISelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, ISelectProps>(
  (
    {
      id,
      label,
      error,
      helperText,
      options,
      children,
      className,
      disabled,
      ...restProps
    },
    ref,
  ) => {
    const generatedId = useId();
    const selectId = id || generatedId;
    const errorId = `${selectId}-error`;
    const helperId = `${selectId}-helper`;

    const describedBy = [
      error ? errorId : '',
      helperText ? helperId : '',
      restProps['aria-describedby'] || '',
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    const selectClasses = [
      styles.select,
      error ? styles.selectError : '',
      className || '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={styles.container}>
        {label && (
          <label htmlFor={selectId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.selectWrapper}>
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={selectClasses}
            {...restProps}
          >
            {options
              ? options.map((option) => (
                  <option
                    key={String(option.value)}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))
              : children}
          </select>
          <ChevronDown className={styles.chevron} aria-hidden="true" />
        </div>
        {error && (
          <span id={errorId} role="alert" className={styles.errorMessage}>
            {error}
          </span>
        )}
        {!error && helperText && (
          <span id={helperId} className={styles.helperText}>
            {helperText}
          </span>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';
