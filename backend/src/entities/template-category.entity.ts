/**
 * TemplateCategory entity — groups checklist questions within a template.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { AuditTemplate } from './audit-template.entity';
import { TemplateQuestion } from './template-question.entity';

@Entity('template_categories')
@Index(['templateId', 'sortOrder'])
export class TemplateCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => AuditTemplate, (template) => template.categories, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: AuditTemplate;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  @OneToMany(() => TemplateQuestion, (question) => question.category, { cascade: true })
  questions: TemplateQuestion[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
