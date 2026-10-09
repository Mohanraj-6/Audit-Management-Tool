/**
 * Settings Service — manages key-value system settings.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from '../../entities/setting.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
    private AuditLogsService: AuditLogsService,
  ) {}

  async findAll(): Promise<Setting[]> {
    return this.settingRepository.find({ order: { key: 'ASC' } });
  }

  async findByKey(key: string): Promise<Setting> {
    const setting = await this.settingRepository.findOne({ where: { key } });
    if (!setting) throw new NotFoundException(`Setting with key '${key}' not found`);
    return setting;
  }

  async findPublic(): Promise<Record<string, any>> {
    const settings = await this.settingRepository.find({ where: { isPublic: true } });
    const result: Record<string, any> = {};
    for (const s of settings) {
      result[s.key] = s.value;
    }
    return result;
  }

  async create(data: { key: string; value: any; type?: string; description?: string; isPublic?: boolean }): Promise<Setting> {
    const setting = this.settingRepository.create({
      key: data.key,
      value: data.value,
      type: data.type || 'string',
      description: data.description,
      isPublic: data.isPublic ?? false,
    });
    return this.settingRepository.save(setting);
  }

  async update(key: string, value: any): Promise<Setting> {
    const setting = await this.findByKey(key);
    setting.value = value;
    if (setting.type === 'number') setting.value = Number(value);
    if (setting.type === 'boolean') setting.value = value === 'true' || value === true;
    return this.settingRepository.save(setting);
  }

  async remove(key: string): Promise<void> {
    const setting = await this.findByKey(key);
    await this.settingRepository.remove(setting);
  }
}
