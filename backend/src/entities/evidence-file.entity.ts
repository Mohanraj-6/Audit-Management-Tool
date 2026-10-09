/**
 * EvidenceFile entity — metadata for uploaded evidence files.
 * Files are stored in S3/MinIO; only metadata is stored in the database.
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
import { EvidenceReferenceType } from '../shared/enums';

@Entity('evidence_files')
@Index(['referenceType', 'referenceId'])
@Index(['uploadedById'])
export class EvidenceFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName: string;

  /**
   * The key/path in S3/MinIO storage
   */
  @Column({ name: 'file_key', type: 'varchar', length: 500 })
  fileKey: string;

  /**
   * Public URL or presigned URL for access
   */
  @Column({ name: 'file_url', type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ name: 'file_size', type: 'integer' })
  fileSize: number;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ name: 'reference_type', type: 'enum', enum: EvidenceReferenceType })
  referenceType: EvidenceReferenceType;

  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId: string;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'is_thumbnail', type: 'boolean', default: false })
  isThumbnail: boolean;

  @CreateDateColumn({ name: 'uploaded_at', type: 'timestamptz' })
  uploadedAt: Date;
}
