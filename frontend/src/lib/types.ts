/**
 * Shared types mirroring the NestJS API payloads.
 */

export type Id = string;

export type UserRole = 'admin' | 'auditor' | 'dept_manager' | 'action_owner' | 'management';
export type AuditStatus = 'draft' | 'in_progress' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'closed';
export type AuditType = 'internal' | 'external' | 'compliance' | 'quality' | 'safety' | 'financial' | 'operational' | 'other';
export type QuestionType = 'yes_no' | 'text' | 'number' | 'multiple_choice' | 'rating';
export type AnswerOption = 'compliant' | 'non_compliant' | 'observation' | 'not_applicable';
export type FindingSeverity = 'critical' | 'major' | 'minor' | 'observation';
export type FindingStatus = 'open' | 'action_assigned' | 'in_progress' | 'pending_verification' | 'closed' | 'overdue';
export type ActionStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'verification' | 'closed' | 'overdue';
export type AuditLogAction = 'created' | 'updated' | 'deleted' | 'status_changed' | 'approved' | 'rejected';

export interface Role {
  id: Id;
  name: UserRole;
  description?: string;
  permissions: string[];
  isActive: boolean;
}

export interface Department {
  id: Id;
  name: string;
  code: string;
  description?: string;
  managerId?: Id;
  manager?: User;
  users?: User[];
  createdAt?: string;
}

export interface Location {
  id: Id;
  name: string;
  code: string;
  address?: string;
  departmentId?: Id;
  department?: Department;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
  createdAt?: string;
}


export interface User {
  id: Id;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: Role;
  department?: Department;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface TemplateQuestion {
  id: Id;
  templateId: Id;
  categoryId?: Id;
  questionText: string;
  questionType: QuestionType;
  isMandatory: boolean;
  weight: number;
  sortOrder: number;
  options: string[];
  category?: TemplateCategory;
}

export interface TemplateCategory {
  id: Id;
  templateId: Id;
  name: string;
  description?: string;
  sortOrder: number;
  questions?: TemplateQuestion[];
}

export interface AuditTemplate {
  id: Id;
  templateNumber: string;
  name: string;
  auditType: AuditType;
  departmentId?: Id;
  department?: Department;
  versionNumber: number;
  effectiveDate?: string;
  description?: string;
  isActive: boolean;
  createdBy?: User;
  parentTemplateId?: Id;
  categories?: TemplateCategory[];
  questions?: TemplateQuestion[];
  createdAt: string;
}

export interface AuditAnswer {
  id: Id;
  auditId: Id;
  questionId: Id;
  question?: TemplateQuestion;
  answer?: AnswerOption | null;
  comment?: string;
  evidenceIds: string[];
  findingId?: Id | null;
  answeredAt?: string;
  answeredById?: Id;
}

export interface AuditAssignee {
  id: Id;
  auditId: Id;
  userId: Id;
  user?: User;
  assignedById?: Id | null;
  assignedBy?: User;
  /** When the allotment email was last sent to this user. */
  emailSentAt?: string | null;
  createdAt: string;
}

export interface Finding {
  id: Id;
  findingNumber: string;
  auditId: Id;
  audit?: Audit;
  questionId?: Id;
  category?: string;
  description: string;
  evidence: any[];
  severity: FindingSeverity;
  responsibleDepartmentId?: Id;
  responsibleDepartment?: Department;
  responsiblePersonId?: Id;
  responsiblePerson?: User;
  dueDate?: string;
  status: FindingStatus;
  createdBy?: User;
  closedAt?: string;
  createdAt: string;
  updatedAt?: string;
  correctiveAction?: CorrectiveAction;
}

export interface CorrectiveAction {
  id: Id;
  actionNumber: string;
  findingId: Id;
  finding?: Finding;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction?: string;
  assignedToId: Id;
  assignedTo?: User;
  dueDate: string;
  completionDate?: string;
  evidence: any[];
  status: ActionStatus;
  verificationComments?: string;
  createdBy?: User;
  verifiedBy?: User;
  closedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Audit {
  id: Id;
  auditNumber: string;
  templateId: Id;
  template?: AuditTemplate;
  title: string;
  description?: string;
  auditType?: string;
  departmentId: Id;
  department?: Department;
  locationId?: Id;
  location?: Location;
  status: AuditStatus;
  auditorId: Id;
  auditor?: User;
  scheduledDate?: string;
  dueDate?: string;
  actualStart?: string;
  actualEnd?: string;
  score: number;
  maxScore: number;
  compliancePercentage: number;
  totalQuestions: number;
  answeredQuestions: number;
  nonComplianceCount: number;
  approvedById?: Id;
  approvedBy?: User;
  approvedAt?: string;
  createdAt: string;
  updatedAt?: string;
  findings?: Finding[];
  answers?: AuditAnswer[];
  /** Users allotted by the auditor (they receive the allotment email). */
  assignees?: AuditAssignee[];
  /** Only present in the create/assign responses — the allotment mail result. */
  assignment?: AuditAssignmentResult;
}

export interface AuditAssignmentResult {
  auditId: Id;
  allottedUsers: Array<{ id: Id; name: string; email: string }>;
  newlyAllottedUsers: Array<{ id: Id; name: string; email: string }>;
  email?: MailSummary | null;
}

export interface MailSummary {
  attempted: number;
  delivered: number;
  outboxed: number;
  failed: number;
  transport: 'smtp' | 'outbox' | 'none';
  results?: Array<{ email: string; name?: string; transport: string; error?: string }>;
}

export interface Notification {
  id: Id;
  userId: Id;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: Id | null;
  relatedType?: string | null;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuditLog {
  id: Id;
  userId?: Id;
  user?: User;
  action: string;
  recordType: string;
  recordId?: Id | null;
  description?: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string | null;
  createdAt: string;
}

export interface Setting {
  key: string;
  value: any;
  type: string;
  description?: string;
  isPublic: boolean;
  updatedAt: string;
}
