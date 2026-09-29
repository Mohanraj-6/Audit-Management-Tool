/**
 * TemplateQuestion entity — a single checklist question within a template.
 * Questions belong to a template and a category.
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
import { AuditTemplate } from './audit-template.entity';
import { TemplateCategory } from './template-category.entity';
import { QuestionType } from '../shared/enums';

@Entity('template_questions')
@Index(['templateId', 'sortOrder'])
export class TemplateQuestion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'template_id', type: 'uuid', nullable: true })
  templateId: string | null;

  /** Null for template questions; set when copied into one audit. */
  @Column({ name: 'audit_id', type: 'uuid', nullable: true })
  auditId: string | null;

  @ManyToOne(() => AuditTemplate, (template) => template.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'template_id' })
  template: AuditTemplate;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @ManyToOne(() => TemplateCategory, (category) => category.questions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: TemplateCategory;

  @Column({ name: 'question_text', type: 'text' })
  questionText: string;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.YesNo,
  })
  questionType: QuestionType;

  @Column({ name: 'is_mandatory', type: 'boolean', default: true })
  isMandatory: boolean;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 1 })
  weight: number;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  sortOrder: number;

  /**
   * JSON of additional options for multiple-choice questions.
   * Example: ["Option A", "Option B", "Option C"]
   */
  @Column({ name: 'options', type: 'jsonb', default: [] })
  options: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
