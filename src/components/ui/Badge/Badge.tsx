/**
 * Badge — semantic status indicator.
 * Usage: <Badge variant="success" dot>Active</Badge>
 */
import React from 'react';
import styles from './Badge.module.css';
import { cx } from '@/lib/utils';
import type { ColorVariant } from '@/types';

export type BadgeVariant = Extract<ColorVariant, 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'>;

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', dot = false, children, className }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[variant], className)}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Map invitation/user statuses to badge variants */
export function statusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    active:   'success',
    accepted: 'success',
    pending:  'warning',
    expired:  'neutral',
    revoked:  'danger',
    inactive: 'danger',
  };
  return map[status.toLowerCase()] ?? 'neutral';
}
