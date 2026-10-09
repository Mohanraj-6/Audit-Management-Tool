/**
 * AuditAssignee entity — the users an auditor has "allotted" to an audit.
 * One row per (audit, user) pair. When a row is created the allotted user is
 * notified in-app and by email (sent from the auditor).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Audit } from './audit.entity';
import { User } from './user.entity';

@Entity('audit_assignees')
@Index(['auditId', 'userId'], { unique: true })
export class AuditAssignee {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'audit_id', type: 'uuid' })
  auditId: string;

  @ManyToOne(() => Audit, (audit) => audit.assignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /** The auditor who allotted this user (defaults to the audit's auditor). */
  @Column({ name: 'assigned_by_id', type: 'uuid', nullable: true })
  assignedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_by_id' })
  assignedBy: User;

  /** When the assignment email was last sent to this user. */
  @Column({ name: 'email_sent_at', type: 'timestamptz', nullable: true })
  emailSentAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
