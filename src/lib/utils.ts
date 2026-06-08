/**
 * Shared utility functions.
 * Pure, framework-agnostic helpers.
 */

// ─── String Helpers ───────────────────────────────────────────────────────────

/** Get initials from a full name (e.g. "John Doe" → "JD") */
export function getInitials(name: string, maxChars = 2): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, maxChars)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

/** Truncate a string to a max length with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/** Capitalize first letter */
export function capitalize(str: string): string {
  if (!str) return '';
  return str[0].toUpperCase() + str.slice(1).toLowerCase();
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

/** Format a date string into a human-readable format */
export function formatDate(
  dateStr: string | undefined,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }
): string {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-US', opts).format(new Date(dateStr));
  } catch {
    return '—';
  }
}

/** Relative time (e.g. "2 hours ago") */
export function timeAgo(dateStr: string): string {
  try {
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    const diffMs = new Date(dateStr).getTime() - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr  = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    if (Math.abs(diffSec) < 60)  return rtf.format(diffSec, 'second');
    if (Math.abs(diffMin) < 60)  return rtf.format(diffMin, 'minute');
    if (Math.abs(diffHr)  < 24)  return rtf.format(diffHr,  'hour');
    if (Math.abs(diffDay) < 30)  return rtf.format(diffDay, 'day');
    return formatDate(dateStr);
  } catch {
    return '—';
  }
}

// ─── Class Name Helper ────────────────────────────────────────────────────────

/** Lightweight cx() — joins truthy class strings */
export function cx(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Validation ───────────────────────────────────────────────────────────────

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Password strength: 0–4 */
export function getPasswordStrength(password: string): number {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password))   score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

export function getPasswordStrengthLabel(score: number): { label: string; color: string } {
  const map: Record<number, { label: string; color: string }> = {
    0: { label: 'Very weak', color: 'var(--color-danger)' },
    1: { label: 'Weak',      color: 'var(--color-danger)' },
    2: { label: 'Fair',      color: 'var(--color-warning)' },
    3: { label: 'Good',      color: 'var(--color-primary)' },
    4: { label: 'Strong',    color: 'var(--color-success)' },
  };
  return map[score] ?? map[0];
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

export const storage = {
  get<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },
  set<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key: string): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  },
};
