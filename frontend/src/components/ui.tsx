'use client';

/**
 * Small, dependency-free UI kit used across all pages.
 */

import { ReactNode } from 'react';
import type { Meta } from '@/lib/constants';

type Tone = 'brand' | 'neutral' | 'danger' | 'success' | 'warning' | 'info';

// ─── Layout ─────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = '',
  padded = true,
  onClick,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
  onClick?: () => void;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className} ${onClick ? 'cursor-pointer transition hover:border-brand-300 hover:shadow' : ''}`}
      onClick={onClick}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'brand',
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const accent: Record<Tone, string> = {
    brand: 'text-brand-600',
    neutral: 'text-slate-700',
    danger: 'text-rose-600',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    info: 'text-sky-600',
  };

  const body = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-300 hover:shadow">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );

  return href ? (
    <a href={href} className="block">
      {body}
    </a>
  ) : (
    body
  );
}

// ─── Feedback ───────────────────────────────────────────────────────
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        className || 'bg-slate-100 text-slate-700 ring-slate-200'
      }`}
    >
      {children}
    </span>
  );
}

export function MetaBadge({ meta, fallback }: { meta?: Meta; fallback?: string }) {
  return <Badge className={meta?.className}>{meta?.label ?? fallback ?? '—'}</Badge>;
}

export function Alert({
  tone = 'info',
  children,
  className = '',
}: {
  tone?: 'info' | 'error' | 'success' | 'warning';
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-sky-50 text-sky-800 border-sky-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
  };
  return <div className={`rounded-lg border px-3 py-2 text-sm ${tones[tone]} ${className}`}>{children}</div>;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600 ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert tone="error" className="flex items-center justify-between gap-3">
      <span>{message}</span>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="font-medium underline">
          Retry
        </button>
      ) : null}
    </Alert>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? <p className="max-w-md text-xs text-slate-500">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = 'brand',
}: {
  value: number;
  tone?: 'brand' | 'success' | 'danger' | 'warning';
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const colors = {
    brand: 'bg-brand-500',
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

// ─── Controls ───────────────────────────────────────────────────────
const BUTTON_TONES: Record<Tone, string> = {
  brand: 'bg-brand-600 text-white hover:bg-brand-700 ring-transparent',
  neutral: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 ring-transparent',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 ring-transparent',
  warning: 'bg-amber-500 text-white hover:bg-amber-600 ring-transparent',
  info: 'bg-sky-600 text-white hover:bg-sky-700 ring-transparent',
};

export function Button({
  children,
  onClick,
  type = 'button',
  tone = 'brand',
  size = 'md',
  disabled,
  loading,
  className = '',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  tone?: Tone;
  size?: 'sm' | 'md';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  title?: string;
}) {
  const sizes = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-2 text-sm',
  };

  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_TONES[tone]} ${sizes[size]} ${className}`}
    >
      {loading ? <Spinner className="border-white/40 border-t-white" /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}

const CONTROL_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:bg-slate-100 disabled:text-slate-500';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return <input {...rest} className={`${CONTROL_CLASSES} ${className}`} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className = '', rows = 3, ...rest } = props;
  return <textarea rows={rows} {...rest} className={`${CONTROL_CLASSES} ${className}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className = '', children, ...rest } = props;
  return (
    <select {...rest} className={`${CONTROL_CLASSES} ${className}`}>
      {children}
    </select>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8">
      <div className={`w-full ${width} rounded-xl bg-white shadow-xl`}>
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export function Table({
  head,
  children,
  className = '',
}: {
  head: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">{head}</thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`px-4 py-2 font-medium ${className}`}>{children}</th>;
}

export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-4 py-2 align-top text-slate-700 ${className}`}>{children}</td>;
}

export function DefinitionList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className="mt-0.5 text-sm text-slate-800">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ key: T; label: string; count?: number }>;
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition ${
            active === tab.key
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {tab.label}
          {tab.count !== undefined ? (
            <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              {tab.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
