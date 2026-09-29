'use client';

/**
 * Small data-fetching helpers shared by all pages.
 * Kept deliberately simple (no external data library) so the frontend has
 * zero runtime dependencies beyond React/Next.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { Department, Location, Role, AuditTemplate, Setting, User } from './types';

export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(path));
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  useEffect(() => {
    if (!path) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Request failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, version]);

  return { data, error, loading, reload, setData };
}

/** Handles a one-off action (create/update/delete) with busy + error state. */
export function useSubmit() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(action: () => Promise<T>): Promise<T | null> => {
    setSubmitting(true);
    setError(null);
    try {
      return await action();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      return null;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submitting, error, setError, run };
}

// ─── Shared lookups ─────────────────────────────────────────────────
export const useDepartments = () => useApi<Department[]>('/departments');
export const useLocations = () => useApi<Location[]>('/locations');
export const useUsers = () => useApi<User[]>('/users');
export const useRoles = () => useApi<Role[]>('/users/roles');
export const useTemplates = () => useApi<AuditTemplate[]>('/templates');
export const useSettings = () => useApi<Setting[]>('/settings');

/**
 * Reads a query-string value on the client. Using this instead of
 * `useSearchParams` keeps the pages out of a Suspense boundary requirement.
 */
export function useQueryParam(key: string): string {
  const [value, setValue] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setValue(params.get(key) || '');
  }, [key]);

  return value;
}
