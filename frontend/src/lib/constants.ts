/**
 * Display metadata for enums, navigation and shared options.
 */

import type {
  ActionStatus,
  AnswerOption,
  AuditStatus,
  AuditType,
  FindingSeverity,
  FindingStatus,
  QuestionType,
  UserRole,
} from './types';

export interface Meta {
  label: string;
  className: string;
}

export const AUDIT_STATUS: Record<AuditStatus, Meta> = {
  draft: { label: 'Draft', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  submitted: { label: 'Submitted', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  in_review: { label: 'In Review', className: 'bg-purple-50 text-purple-700 ring-purple-200' },
  approved: { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  rejected: { label: 'Rejected', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  closed: { label: 'Closed', className: 'bg-teal-50 text-teal-700 ring-teal-200' },
};

export const FINDING_STATUS: Record<FindingStatus, Meta> = {
  open: { label: 'Open', className: 'bg-rose-50 text-rose-700 ring-rose-200' },
  action_assigned: { label: 'Action Assigned', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  pending_verification: { label: 'Pending Verification', className: 'bg-purple-50 text-purple-700 ring-purple-200' },
  closed: { label: 'Closed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800 ring-red-300' },
};

export const FINDING_SEVERITY: Record<FindingSeverity, Meta> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 ring-red-300' },
  major: { label: 'Major', className: 'bg-orange-50 text-orange-700 ring-orange-200' },
  minor: { label: 'Minor', className: 'bg-yellow-50 text-yellow-700 ring-yellow-200' },
  observation: { label: 'Observation', className: 'bg-sky-50 text-sky-700 ring-sky-200' },
};

export const ACTION_STATUS: Record<ActionStatus, Meta> = {
  open: { label: 'Open', className: 'bg-slate-100 text-slate-700 ring-slate-200' },
  assigned: { label: 'Assigned', className: 'bg-amber-50 text-amber-700 ring-amber-200' },
  in_progress: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 ring-blue-200' },
  completed: { label: 'Completed', className: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  verification: { label: 'Pending Verification', className: 'bg-purple-50 text-purple-700 ring-purple-200' },
  closed: { label: 'Closed', className: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800 ring-red-300' },
};

export const ANSWER_OPTIONS: Array<{ value: AnswerOption; label: string; className: string }> = [
  { value: 'compliant', label: 'Compliant', className: 'text-emerald-700' },
  { value: 'non_compliant', label: 'Non-Compliant', className: 'text-rose-700' },
  { value: 'observation', label: 'Observation', className: 'text-amber-700' },
  { value: 'not_applicable', label: 'Not Applicable', className: 'text-slate-500' },
];

export const USER_ROLES: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Administrator' },
  { value: 'auditor', label: 'Auditor' },
  { value: 'dept_manager', label: 'Department Manager' },
  { value: 'action_owner', label: 'Action Owner' },
  { value: 'management', label: 'Management' },
];

export const AUDIT_TYPES: Array<{ value: AuditType; label: string }> = [
  { value: 'internal', label: 'Internal' },
  { value: 'external', label: 'External' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'quality', label: 'Quality' },
  { value: 'safety', label: 'Safety' },
  { value: 'financial', label: 'Financial' },
  { value: 'operational', label: 'Operational' },
  { value: 'other', label: 'Other' },
];

export const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'yes_no', label: 'Yes / No' },
  { value: 'text', label: 'Free Text' },
  { value: 'number', label: 'Number' },
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'rating', label: 'Rating' },
];

export const LOG_ACTIONS = ['created', 'updated', 'deleted', 'status_changed', 'approved', 'rejected'];
export const LOG_RECORD_TYPES = ['Audit', 'Finding', 'CorrectiveAction', 'AuditTemplate', 'User', 'Department', 'Location', 'Setting'];

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: '▤' },
  { href: '/audits', label: 'Audits', icon: '✓' },
  { href: '/findings', label: 'Findings', icon: '⚠' },
  { href: '/corrective-actions', label: 'Corrective Actions', icon: '⚑' },
  { href: '/templates', label: 'Templates', icon: '☰' },
  { href: '/reports', label: 'Reports', icon: '⤓' },
  { href: '/users', label: 'Users', icon: '☺' },
  { href: '/departments', label: 'Departments', icon: '⌂' },
  { href: '/locations', label: 'Locations', icon: '⌖' },
  { href: '/notifications', label: 'Notifications', icon: '✉' },
  { href: '/audit-logs', label: 'Audit Log', icon: '◷' },
  { href: '/settings', label: 'Settings', icon: '⚙' },
];

/** Human readable label for a snake_case enum/key value. */
export function humanize(value?: string | null): string {
  if (!value) return '—';
  return value
    .split(/[_\s]+/)
    .map((part) => (part.length <= 3 && part === part.toLowerCase() && part !== 'and' ? part.toUpperCase() : part.charAt(0).toUpperCase() + part.slice(1)))
    .join(' ');
}
