/**
 * All enums used across the Audit Management System.
 * Centralized for consistency between entities, DTOs, and the frontend.
 */

// ─── User Roles ───────────────────────────────────────────────────────────
export enum UserRole {
  Admin = 'admin',
  Auditor = 'auditor',
  DepartmentManager = 'dept_manager',
  ActionOwner = 'action_owner',
  Management = 'management',
}

// ─── Audit Status ─────────────────────────────────────────────────────────
export enum AuditStatus {
  Draft = 'draft',
  InProgress = 'in_progress',
  Submitted = 'submitted',
  InReview = 'in_review',
  Approved = 'approved',
  Rejected = 'rejected',
  Closed = 'closed',
}

// ─── Audit Template Audit Types ───────────────────────────────────────────
export enum AuditType {
  Internal = 'internal',
  External = 'external',
  Compliance = 'compliance',
  Quality = 'quality',
  Safety = 'safety',
  Financial = 'financial',
  Operational = 'operational',
  Other = 'other',
}

// ─── Question Types ───────────────────────────────────────────────────────
export enum QuestionType {
  YesNo = 'yes_no',
  Text = 'text',
  Number = 'number',
  MultipleChoice = 'multiple_choice',
  Rating = 'rating',
}

// ─── Answer Options ───────────────────────────────────────────────────────
export enum AnswerOption {
  Compliant = 'compliant',
  NonCompliant = 'non_compliant',
  Observation = 'observation',
  NotApplicable = 'not_applicable',
}

// ─── Finding Severity ─────────────────────────────────────────────────────
export enum FindingSeverity {
  Critical = 'critical',
  Major = 'major',
  Minor = 'minor',
  Observation = 'observation',
}

// ─── Finding Status ───────────────────────────────────────────────────────
export enum FindingStatus {
  Open = 'open',
  ActionAssigned = 'action_assigned',
  InProgress = 'in_progress',
  PendingVerification = 'pending_verification',
  Closed = 'closed',
  Overdue = 'overdue',
}

// ─── Corrective Action Status ─────────────────────────────────────────────
export enum ActionStatus {
  Open = 'open',
  Assigned = 'assigned',
  InProgress = 'in_progress',
  Completed = 'completed',
  Verification = 'verification',
  Closed = 'closed',
  Overdue = 'overdue',
}

// ─── Approval Status ──────────────────────────────────────────────────────
export enum ApprovalStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

// ─── Notification Types ───────────────────────────────────────────────────
export enum NotificationType {
  AuditAssigned = 'audit_assigned',
  AuditDue = 'audit_due',
  FindingCreated = 'finding_created',
  ActionAssigned = 'action_assigned',
  ActionDueSoon = 'action_due_soon',
  ActionOverdue = 'action_overdue',
  ActionSubmittedForVerification = 'action_submitted_for_verification',
  AuditApproved = 'audit_approved',
  AuditRejected = 'audit_rejected',
}

// ─── Evidence Reference Types ─────────────────────────────────────────────
export enum EvidenceReferenceType {
  Audit = 'audit',
  Finding = 'finding',
  CorrectiveAction = 'corrective_action',
}

// ─── Record Types for Audit Log ───────────────────────────────────────────
export enum AuditLogActionType {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
  StatusChanged = 'status_changed',
  Approved = 'approved',
  Rejected = 'rejected',
}
