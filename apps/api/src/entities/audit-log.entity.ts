/**
 * AuditLog entity — immutable log of all important actions.
 * Never updated or deleted (append-only).
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
import { User } from './user.entity';
import { AuditLogActionType } from '../shared/enums';

@Entity('audit_logs')
@Index(['action'])
@Index(['recordType', 'recordId'])
@Index(['createdAt'])
@Index(['userId'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: AuditLogActionType,
  })
  action: AuditLogActionType;

  @Column({ name: 'record_type', type: 'varchar', length: 100 })
  recordType: string;

  @Column({ name: 'record_id', type: 'uuid', nullable: true })
  recordId: string | null;

  @Column({ name: 'description', type: 'text' })
  description: string;

  /**
   * JSON representation of the previous value (before change)
   */
  @Column({ name: 'old_value', type: 'jsonb', nullable: true })
  oldValue: Record<string, any> | null;

  /**
   * JSON representation of the new value (after change)
   */
  @Column({ name: 'new_value', type: 'jsonb', nullable: true })
  newValue: Record<string, any> | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
