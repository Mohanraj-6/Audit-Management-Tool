/**
 * AuditAnswer entity — stores individual answers to checklist questions
 * during an audit. Links an answer to a finding (if one was created).
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
import { TemplateQuestion } from './template-question.entity';
import { Finding } from './finding.entity';
import { AnswerOption } from '../shared/enums';

@Entity('audit_answers')
@Index(['auditId', 'questionId'], { unique: true })
export class AuditAnswer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'audit_id', type: 'uuid' })
  auditId: string;

  @ManyToOne(() => Audit, (audit) => audit.answers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'audit_id' })
  audit: Audit;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId: string;

  @ManyToOne(() => TemplateQuestion, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'question_id' })
  question: TemplateQuestion;

  @Column({
    type: 'enum',
    enum: AnswerOption,
    nullable: true,
  })
  answer: AnswerOption | null;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  /**
   * JSON array of evidence file IDs uploaded for this answer
   */
  @Column({ name: 'evidence_ids', type: 'jsonb', default: [] })
  evidenceIds: string[];

  @Column({ name: 'finding_id', type: 'uuid', nullable: true })
  findingId: string | null;

  @ManyToOne(() => Finding, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'finding_id' })
  finding: Finding;

  @Column({ name: 'answered_at', type: 'timestamptz', nullable: true })
  answeredAt: Date | null;

  @Column({ name: 'answered_by', type: 'uuid', nullable: true })
  answeredById: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt: Date;
}
