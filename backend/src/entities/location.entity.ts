/**
 * Location entity — a physical site where audits can be conducted.
 * Each location belongs to a Department.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  JoinColumn,
} from 'typeorm';
import { Department } from './department.entity';
import { Audit } from './audit.entity';

@Entity('locations')
@Index(['name'], { unique: true })
@Index(['code'], { unique: true })
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number | null;

  @Column({ name: 'longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number | null;

  @ManyToOne(() => Department, (department) => department.locations, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ name: 'department_id', type: 'uuid', nullable: true })
  departmentId: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
