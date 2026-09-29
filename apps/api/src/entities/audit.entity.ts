/**
 * Audit entity — represents an instance of an audit based on a template.
 * The audit_number is auto-generated (e.g. AUD-2026-0001).
 * The template reference is immutable once the audit starts to preserve
 * the original template version for completed audits.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { AuditTemplate } from './audit-template.entity';
import { User } from './user.entity';
import { Department } from './department.entity';
import { Location } from './location.entity';
import { AuditAnswer } from './audit-answer.entity';
import { AuditAssignee } from './audit-assignee.entity';
import { Finding } from './finding.entity';
import { Approval } from './approval.entity';
import { AuditStatus } from '../shared/enums';

@Entity('audits')
@Index(['auditNumber'], { unique: true })
@Index(['status'])
@Index(['departmentId'])
@Index(['auditorId'])
export class Audit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'audit_number', type: 'varchar', length: 30, unique: true })
  auditNumber: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => AuditTemplate, (template) => template.audits, {
    eager: true,
    onDelete: 'RESTRICT', // Prevent deleting templates that have audits
  })
  @JoinColumn({ name: 'template_id' })
  template: AuditTemplate;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'audit_type', type: 'varchar', length: 50, nullable: true })
  auditType: string | null;

  @Column({ name: 'department_id', type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department, (department) => department.audits, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'location_id', type: 'uuid', nullable: true })
  locationId: string | null;

  @ManyToOne(() => Location, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({
    type: 'enum',
    enum: AuditStatus,
    default: AuditStatus.Draft,
  })
  status: AuditStatus;

  @Column({ name: 'auditor_id', type: 'uuid' })
  auditorId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'auditor_id' })
  auditor: User;

  @Column({ name: 'scheduled_date', type: 'timestamptz', nullable: true })
  scheduledDate: Date | null;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({ name: 'actual_start', type: 'timestamptz', nullable: true })
  actualStart: Date | null;

  @Column({ name: 'actual_end', type: 'timestamptz', nullable: true })
  actualEnd: Date | null;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number;

  @Column({ name: 'max_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  maxScore: number;

  @Column({ name: 'compliance_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
  compliancePercentage: number;

  @Column({ name: 'total_questions', type: 'integer', default: 0 })
  totalQuestions: number;

  @Column({ name: 'answered_questions', type: 'integer', default: 0 })
  answeredQuestions: number;

  @Column({ name: 'non_compliance_count', type: 'integer', default: 0 })
  nonComplianceCount: number;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approvedBy: User;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @OneToMany(() => AuditAnswer, (answer) => answer.audit, { cascade: true })
  answers: AuditAnswer[];

  @OneToMany(() => Finding, (finding) => finding.audit, { cascade: true })
  findings: Finding[];

  @OneToMany(() => Approval, (approval) => approval.audit, { cascade: true })
  approvals: Approval[];

  /** Users allotted by the auditor — they receive the assignment email. */
  @OneToMany(() => AuditAssignee, (assignee) => assignee.audit, { cascade: true })
  assignees: AuditAssignee[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
