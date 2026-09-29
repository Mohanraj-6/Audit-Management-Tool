/**
 * Locations Service — manages physical locations where audits are conducted.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from '../../entities/location.entity';
import { Department } from '../../entities/department.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { generateUUID } from '../../shared/utils/helpers';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
    @InjectRepository(Department)
    private departmentRepository: Repository<Department>,
    private AuditLogsService: AuditLogsService,
  ) {}

  async findAll(search?: string, departmentId?: string): Promise<Location[]> {
    const qb = this.locationRepository.createQueryBuilder('loc')
      .leftJoinAndSelect('loc.department', 'department')
      .orderBy('loc.name', 'ASC');

    if (search) {
      qb.where('(loc.name ILIKE :search OR loc.code ILIKE :search OR loc.address ILIKE :search)', {
        search: `%${search}%`,
      });
    }
    if (departmentId) {
      qb.andWhere('loc.departmentId = :deptId OR loc.departmentId IS NULL', { deptId: departmentId });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<Location> {
    const loc = await this.locationRepository.findOne({
      where: { id },
      relations: ['department'],
    });
    if (!loc) throw new NotFoundException(`Location with ID ${id} not found`);
    return loc;
  }

  async create(data: {
    name: string; code: string; address?: string;
    latitude?: number; longitude?: number;
    departmentId?: string;
  }): Promise<Location> {
    const loc = this.locationRepository.create({
      id: generateUUID(),
      name: data.name,
      code: data.code,
      address: data.address,
      latitude: data.latitude,
      longitude: data.longitude,
      departmentId: data.departmentId,
      isActive: true,
    });

    const saved = await this.locationRepository.save(loc);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'created', 'Location', saved.id, null,
      { id: saved.id, name: saved.name, code: saved.code },
    );
    return saved;
  }

  async update(id: string, data: {
    name?: string; code?: string; address?: string;
    latitude?: number; longitude?: number;
    departmentId?: string; isActive?: boolean;
  }): Promise<Location> {
    const loc = await this.findOne(id);
    const oldValues = { name: loc.name, code: loc.code, address: loc.address, isActive: loc.isActive };

    Object.assign(loc, data);
    const saved = await this.locationRepository.save(loc);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'Location', saved.id, oldValues,
      { name: saved.name, code: saved.code, address: saved.address, isActive: saved.isActive },
    );
    return saved;
  }

  async remove(id: string): Promise<void> {
    const loc = await this.findOne(id);
    await this.locationRepository.remove(loc);
    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'deleted', 'Location', id, { id, name: loc.name }, null,
    );
  }
}
