/**
 * Setting entity — key-value store for system settings.
 * Examples: company_name, company_logo, audit_number_prefix, etc.
 */

import {
  Entity,
  Column,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  key: string;

  @Column({ name: 'value', type: 'jsonb' })
  value: any;

  @Column({ name: 'type', type: 'varchar', length: 50, default: 'string' })
  type: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_public', type: 'boolean', default: false })
  isPublic: boolean;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
