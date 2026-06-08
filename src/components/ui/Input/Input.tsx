/**
 * Input — accessible form input with icon support.
 * Usage: <Input label="Email" type="email" leftIcon={<Mail />} error="Required" />
 */
import React, { forwardRef, useId } from 'react';
import styles from './Input.module.css';
import { cx } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightElement, fullWidth, className, id: propId, ...props },
  ref
) {
  const autoId = useId();
  const id = propId ?? autoId;

  return (
    <div className={cx(styles.wrapper, fullWidth && styles.fullWidth)}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <div className={cx(styles.inputWrap, error && styles.hasError)}>
        {leftIcon && <span className={styles.leftIcon} aria-hidden="true">{leftIcon}</span>}
        <input
          ref={ref}
          id={id}
          className={cx(
            styles.input,
            !!leftIcon && styles.withLeftIcon,
            !!rightElement && styles.withRightEl,
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          {...props}
        />
        {rightElement && <span className={styles.rightEl}>{rightElement}</span>}
      </div>
      {hint && !error && (
        <p id={`${id}-hint`} className={styles.hint}>{hint}</p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error} role="alert">{error}</p>
      )}
    </div>
  );
});
