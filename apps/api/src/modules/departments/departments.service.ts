/**
 * Departments Service — manages company departments.
 */

import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import { User } from '../../entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateUUID } from '../../shared/utils/helpers';

export interface CreateDepartmentInput {
  name?: string;
  code?: string;
  description?: string | null;
  managerId?: string | null;
}

export interface UpdateDepartmentInput {
  name?: string;
  code?: string;
  description?: string | null;
  managerId?: string | null;
}

function normaliseText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function normaliseManagerId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private AuditLogsService: AuditLogsService,
  ) {}

  async findAll(search?: string): Promise<Department[]> {
    const qb = this.departmentRepository.createQueryBuilder('dept')
      .leftJoinAndSelect('dept.manager', 'manager')
      .orderBy('dept.name', 'ASC');

    if (search) {
      qb.where('(dept.name ILIKE :search OR dept.code ILIKE :search OR dept.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Department> {
    const dept = await this.departmentRepository.findOne({
      where: { id },
      relations: ['manager', 'users'],
    });
    if (!dept) throw new NotFoundException(`Department with ID ${id} not found`);
    return dept;
  }

  async create(data: CreateDepartmentInput): Promise<Department> {
    const name = normaliseText(data?.name);
    const code = normaliseText(data?.code)?.toUpperCase() ?? null;

    if (!name || !code) {
      throw new BadRequestException('Department name and code are required');
    }

    const existing = await this.departmentRepository.findOne({ where: [{ code }, { name }] });
    if (existing) throw new ConflictException('A department with this code or name already exists');

    const managerId = normaliseManagerId(data?.managerId);
    if (managerId) {
      await this.assertManagerExists(managerId);
    }

    const dept = this.departmentRepository.create({
      id: generateUUID(),
      name,
      code,
      description: normaliseText(data?.description),
      managerId: managerId ?? null,
    });

    const saved = await this.departmentRepository.save(dept);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'created', 'Department', saved.id, null,
      { id: saved.id, name: saved.name, code: saved.code },
    );
    return saved;
  }

  async update(id: string, data: UpdateDepartmentInput): Promise<Department> {
    const dept = await this.findOne(id);
    const oldValues = { name: dept.name, code: dept.code, description: dept.description, managerId: dept.managerId };

    if (data.name !== undefined) {
      const name = normaliseText(data.name);
      if (!name) {
        throw new BadRequestException('Department name cannot be empty');
      }
      if (name !== dept.name) {
        const clash = await this.departmentRepository.findOne({ where: { name } });
        if (clash && clash.id !== id) {
          throw new ConflictException('Another department already uses this name');
        }
        dept.name = name;
      }
    }

    if (data.code !== undefined) {
      const code = normaliseText(data.code)?.toUpperCase() ?? null;
      if (!code) {
        throw new BadRequestException('Department code cannot be empty');
      }
      if (code !== dept.code) {
        const clash = await this.departmentRepository.findOne({ where: { code } });
        if (clash && clash.id !== id) {
          throw new ConflictException('Another department already uses this code');
        }
        dept.code = code;
      }
    }

    if (data.description !== undefined) dept.description = normaliseText(data.description);

    if (data.managerId !== undefined) {
      const managerId = normaliseManagerId(data.managerId);
      if (managerId) {
        await this.assertManagerExists(managerId);
      }
      dept.managerId = managerId ?? null;
    }

    const saved = await this.departmentRepository.save(dept);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'Department', saved.id, oldValues,
      { name: saved.name, code: saved.code, description: saved.description, managerId: saved.managerId },
    );
    return saved;
  }

  async remove(id: string): Promise<Department> {
    const dept = await this.findOne(id);
    await this.departmentRepository.remove(dept);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'deleted', 'Department', id, { id, name: dept.name }, null,
    );
    return dept;
  }

  /**
   * Guards against dangling references: the manager dropdown may contain a
   * stale user id, and an empty selection means "no manager" rather than
   * "keep the current one".
   */
  private async assertManagerExists(managerId: string): Promise<void> {
    const manager = await this.userRepository.findOne({ where: { id: managerId } });
    if (!manager) {
      throw new NotFoundException(`Manager user with ID ${managerId} not found`);
    }
  }
}
