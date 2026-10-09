/**
 * Finding entity — a non-conformity or observation recorded during an audit.
 * Finding numbers are auto-generated (e.g. FND-2026-0001).
 * Each finding can have one corrective action.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Audit } from './audit.entity';
import { TemplateQuestion } from './template-question.entity';
import { CorrectiveAction } from './corrective-action.entity';
import { User } from './user.entity';
import { Department } from './department.entity';
import { FindingSeverity, FindingStatus } from '../shared/enums';

@Entity('findings')
@Index(['findingNumber'], { unique: true })
@Index(['status'])
@Index(['severity'])
@Index(['auditId'])
export class Finding {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'finding_number', type: 'varchar', length: 30, unique: true })
  findingNumber: string;

  @Column({ name: 'audit_id', type: 'uuid' })
  auditId: string;

  @ManyToOne(() => Audit, (audit) => audit.findings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;

  @Column({ name: 'question_id', type: 'uuid', nullable: true })
  questionId: string | null;

  @ManyToOne(() => TemplateQuestion, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'question_id' })
  question: TemplateQuestion;

  @Column({ type: 'varchar', length: 200, nullable: true })
  category: string | null;

  @Column({ type: 'text' })
  description: string;

  /**
   * JSON array of evidence file metadata
   * Example: [{ id, fileName, fileKey, url }]
   */
  @Column({ name: 'evidence_json', type: 'jsonb', default: [] })
  evidence: any[];

  @Column({
    type: 'enum',
    enum: FindingSeverity,
    default: FindingSeverity.Minor,
  })
  severity: FindingSeverity;

  @Column({ name: 'responsible_department_id', type: 'uuid', nullable: true })
  responsibleDepartmentId: string | null;

  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_department_id' })
  responsibleDepartment: Department;

  @Column({ name: 'responsible_person_id', type: 'uuid', nullable: true })
  responsiblePersonId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_person_id' })
  responsiblePerson: User;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date | null;

  @Column({
    type: 'enum',
    enum: FindingStatus,
    default: FindingStatus.Open,
  })
  status: FindingStatus;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToOne(() => CorrectiveAction, (action) => action.finding, { cascade: true })
  correctiveAction: CorrectiveAction;
}
