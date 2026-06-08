/**
 * Button — reusable UI button with semantic variants.
 * Usage: <Button variant="primary" size="md" loading={false}>Save</Button>
 */
import React from 'react';
import styles from './Button.module.css';
import { cx } from '@/lib/utils';
import type { ColorVariant, SizeVariant } from '@/types';

export type ButtonVariant = Extract<ColorVariant, 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning'>;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: SizeVariant;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  as?: 'button' | 'a';
  href?: string;
}

export function Button({
  variant = 'outline',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  as: Tag = 'button',
  href,
  ...props
}: ButtonProps) {
  const cls = cx(
    styles.btn,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    className
  );

  const content = (
    <>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {!loading && leftIcon && <span className={styles.icon}>{leftIcon}</span>}
      {children && <span>{children}</span>}
      {!loading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
    </>
  );

  if (Tag === 'a' && href) {
    return <a href={href} className={cls}>{content}</a>;
  }

  return (
    <button
      className={cls}
      disabled={disabled || loading}
      {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {content}
    </button>
  );
}
