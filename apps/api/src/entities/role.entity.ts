/**
 * Role entity — defines the access roles available in the system.
 *
 * Roles: admin, auditor, dept_manager, action_owner, management
 * Each role has a defined set of permissions (stored as JSON for flexibility).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { UserRole } from '../shared/enums';

@Entity('roles')
@Index(['name'], { unique: true })
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: UserRole, unique: true })
  name: UserRole;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * JSON array of permission keys for fine-grained control.
   * Example: ["audit:create", "finding:edit", "template:manage"]
   * If empty/null, the role's base permissions apply.
   */
  @Column({ type: 'jsonb', default: [] })
  permissions: string[];

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.role)
  users: User[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
