/**
 * Department entity — represents a company department.
 * Each department can have a manager (a User) and belongs to a Location set.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Location } from './location.entity';
import { AuditTemplate } from './audit-template.entity';
import { Audit } from './audit.entity';

@Entity('departments')
@Index(['name'], { unique: true })
@Index(['code'], { unique: true })
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * The manager of this department (a user with dept_manager role).
   * Stored as a relation for convenience but also referenced by role.
   */
  @Column({ name: 'manager_id', type: 'uuid', nullable: true })
  managerId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'manager_id' })
  manager: User;

  @OneToMany(() => User, (user) => user.department)
  users: User[];

  @OneToMany(() => Location, (location) => location.department)
  locations: Location[];

  @OneToMany(() => AuditTemplate, (template) => template.department)
  templates: AuditTemplate[];

  @OneToMany(() => Audit, (audit) => audit.department)
  audits: Audit[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
