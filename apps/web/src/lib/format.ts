/**
 * Formatting helpers (dates, numbers, due-date language).
 */

export function formatDate(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Whole days between today and the given date (negative = in the past). */
export function daysUntil(value?: string | Date | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);

  return Math.round((target.getTime() - startOfToday.getTime()) / (24 * 60 * 60 * 1000));
}

/** Human friendly due-date text, e.g. "in 3 days" or "4 days overdue". */
export function dueLabel(value?: string | Date | null): string {
  const days = daysUntil(value);
  if (days === null) return '—';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days === -1) return '1 day overdue';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  return `in ${days} days`;
}

export function isOverdue(value?: string | Date | null): boolean {
  const days = daysUntil(value);
  return days !== null && days < 0;
}

export function initials(firstName?: string, lastName?: string): string {
  const first = (firstName || '').trim().charAt(0);
  const last = (lastName || '').trim().charAt(0);
  return `${first}${last}`.toUpperCase() || '?';
}

export function fullName(person?: { firstName?: string; lastName?: string } | null): string {
  if (!person) return '—';
  const name = `${person.firstName || ''} ${person.lastName || ''}`.trim();
  return name || '—';
}

export function formatNumber(value?: number | string | null, digits = 0): string {
  if (value === null || value === undefined || value === '') return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function percent(value?: number | string | null): string {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return `${Math.round(num * 100) / 100}%`;
}

export function truncate(text?: string | null, length = 90): string {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

export function relativeTime(value?: string | Date | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** ISO date string (yyyy-mm-dd) for <input type="date"> values. */
export function toDateInput(value?: string | Date | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function toDateTimeInput(value?: string | Date | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}
