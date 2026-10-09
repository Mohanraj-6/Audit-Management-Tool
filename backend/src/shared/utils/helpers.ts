/**
 * Simple UUID v4 generator (uses crypto for randomness)
 */
import { randomUUID } from 'crypto';

export function generateUUID(): string {
  return randomUUID();
}

/**
 * Generates a numbered ID with a year prefix, e.g. AUD-2026-0001
 */
export function generateNumberedId(prefix: string, year: number, sequence: number): string {
  return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Calculates the current year
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Checks if an object is empty
 */
export function isEmpty(obj: unknown): boolean {
  if (obj == null) return true;
  if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj as Record<string, unknown>).length === 0;
  return false;
}

/**
 * Sleep / delay utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
