/**
 * AuditTemplate entity — a reusable template for creating audits.
 *
 * Templates are version-controlled via the version_number field.
 * When a template is cloned for a new version, the old version remains
 * linked to any completed audits (audits store the template_id of the
 * specific version they were based on).
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
import { Department } from './department.entity';
import { User } from './user.entity';
import { TemplateCategory } from './template-category.entity';
import { TemplateQuestion } from './template-question.entity';
import { Audit } from './audit.entity';
import { AuditType } from '../shared/enums';

@Entity('audit_templates')
@Index(['templateNumber'], { unique: true })
@Index(['name'])
export class AuditTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_number', type: 'varchar', length: 30, unique: true })
  templateNumber: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'audit_type', type: 'enum', enum: AuditType, default: AuditType.Internal })
  auditType: AuditType;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @ManyToOne(() => Department, (department) => department.templates, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'version_number', type: 'integer', default: 1 })
  versionNumber: number;

  @Column({ name: 'effective_date', type: 'date', nullable: true })
  effectiveDate: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  /**
   * Self-reference: parent template (previous version).
   * Null for the original version.
   */
  @Column({ name: 'parent_template_id', type: 'uuid', nullable: true })
  parentTemplateId: string | null;

  @ManyToOne(() => AuditTemplate, { nullable: true })
  @JoinColumn({ name: 'parent_template_id' })
  parentTemplate: AuditTemplate;

  @OneToMany(() => TemplateCategory, (category) => category.template, { cascade: true })
  categories: TemplateCategory[];

  @OneToMany(() => TemplateQuestion, (question) => question.template, { cascade: true })
  questions: TemplateQuestion[];

  @OneToMany(() => Audit, (audit) => audit.template)
  audits: Audit[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
