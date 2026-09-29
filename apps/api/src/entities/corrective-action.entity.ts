/**
 * CorrectiveAction entity — tracks the resolution of a finding.
 * Action numbers are auto-generated (e.g. CA-2026-0001).
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
import { Finding } from './finding.entity';
import { User } from './user.entity';
import { ActionStatus } from '../shared/enums';

@Entity('corrective_actions')
@Index(['actionNumber'], { unique: true })
@Index(['status'])
@Index(['findingId'])
@Index(['assignedToId'])
export class CorrectiveAction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'action_number', type: 'varchar', length: 30, unique: true })
  actionNumber: string;

  @Column({ name: 'finding_id', type: 'uuid' })
  findingId: string;

  @OneToOne(() => Finding, (finding) => finding.correctiveAction, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'finding_id' })
  finding: Finding;

  @Column({ name: 'root_cause', type: 'text', nullable: true })
  rootCause: string | null;

  @Column({ name: 'corrective_action', type: 'text' })
  correctiveAction: string;

  @Column({ name: 'preventive_action', type: 'text', nullable: true })
  preventiveAction: string | null;

  @Column({ name: 'assigned_to_id', type: 'uuid' })
  assignedToId: string;

  @ManyToOne(() => User, { eager: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_to_id' })
  assignedTo: User;

  @Column({ name: 'due_date', type: 'timestamptz' })
  dueDate: Date;

  @Column({ name: 'completion_date', type: 'timestamptz', nullable: true })
  completionDate: Date | null;

  /**
   * JSON array of evidence file metadata
   */
  @Column({ name: 'evidence_json', type: 'jsonb', default: [] })
  evidence: any[];

  @Column({
    type: 'enum',
    enum: ActionStatus,
    default: ActionStatus.Open,
  })
  status: ActionStatus;

  @Column({ name: 'verification_comments', type: 'text', nullable: true })
  verificationComments: string | null;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by' })
  verifiedBy: User;

  @Column({ name: 'closed_at', type: 'timestamptz', nullable: true })
  closedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
