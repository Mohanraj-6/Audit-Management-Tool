'use client';

/**
 * Application shell — dark sidebar navigation plus a compact top bar showing
 * the company name, unread notification count and the signed-in user.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, DEFAULT_USER_ID } from '@/lib/api';
import { NAV_ITEMS } from '@/lib/constants';
import { initials } from '@/lib/format';
import type { User } from '@/lib/types';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState(
    process.env.NEXT_PUBLIC_COMPANY_NAME || 'Audit Management System',
  );
  const [unread, setUnread] = useState(0);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    api
      .get<Record<string, any>>('/settings/public')
      .then((settings) => {
        if (settings?.company_name) setCompanyName(String(settings.company_name));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const load = () => {
      api
        .get<{ count: number }>(`/notifications/count/${DEFAULT_USER_ID}`)
        .then((result) => setUnread(Number(result?.count ?? 0)))
        .catch(() => undefined);
    };

    load();
    const timer = setInterval(load, 60000);
    return () => clearInterval(timer);
  }, [pathname]);

  useEffect(() => {
    api
      .get<User>(`/users/${DEFAULT_USER_ID}`)
      .then(setCurrentUser)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 overflow-y-auto bg-slate-900 text-slate-200 transition-transform lg:static lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            AMS
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">Audit Manager</p>
            <p className="text-[11px] text-slate-400">Internal audits &amp; CAPA</p>
          </div>
        </div>

        <nav className="mt-2 space-y-0.5 px-2 pb-6">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                isActive(item.href)
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="w-4 text-center text-xs opacity-80">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.href === '/notifications' && unread > 0 ? (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {unread}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>
      </aside>

      {navOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <button
            type="button"
            onClick={() => setNavOpen((open) => !open)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-slate-600 lg:hidden"
            aria-label="Toggle navigation"
          >
            ☰
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{companyName}</p>
            <p className="text-[11px] text-slate-400">Internal audit management system</p>
          </div>

          <Link
            href="/notifications"
            className="relative rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-50"
          >
            ✉ Notifications
            {unread > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {unread}
              </span>
            ) : null}
          </Link>

          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initials(currentUser?.firstName, currentUser?.lastName)}
            </span>
            <div className="hidden leading-tight sm:block">
              <p className="text-xs font-medium text-slate-700">
                {currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Signed in user'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">
                {currentUser?.role?.name?.replace(/_/g, ' ') || 'admin'}
              </p>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>

        <footer className="border-t border-slate-200 px-4 py-3 text-center text-[11px] text-slate-400 lg:px-8">
          Audit Management System · OpenAPI documentation at <span className="font-medium">/api/docs</span>
        </footer>
      </div>
    </div>
  );
}
