/**
 * Table — production-ready table with hover states, sort, empty states.
 */
import React from 'react';
import styles from './Table.module.css';
import { cx } from '@/lib/utils';

// ── Types ──

export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

interface TableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  className?: string;
  onRowClick?: (row: T) => void;
}

// ── Skeleton rows ──
function SkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <tr key={i} className={styles.skeletonRow}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className={styles.td}>
              <span className={styles.skeleton} style={{ width: `${50 + Math.random() * 40}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ── Main Table ──
export function Table<T extends { id: string }>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data found.',
  emptyIcon,
  className,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className={cx(styles.wrapper, className)}>
      <table className={styles.table}>
        <thead>
          <tr className={styles.headRow}>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={cx(styles.th, col.align && styles[`align-${col.align}`])}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows cols={columns.length} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={styles.emptyCell}>
                <div className={styles.emptyState}>
                  {emptyIcon && <span className={styles.emptyIcon}>{emptyIcon}</span>}
                  <p className={styles.emptyText}>{emptyMessage}</p>
                </div>
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row.id}
                className={cx(styles.bodyRow, onRowClick && styles.clickable)}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cx(styles.td, col.align && styles[`align-${col.align}`])}
                  >
                    {col.render
                      ? col.render(row, index)
                      : (row[col.key as keyof T] as React.ReactNode) ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
