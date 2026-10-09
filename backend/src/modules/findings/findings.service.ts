/**
 * Findings Service — manages audit findings (non-conformities).
 *
 * Findings are created when an auditor records a non-compliance.
 * Each finding can have a corrective action assigned to it.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Finding } from '../../entities/finding.entity';
import { Audit } from '../../entities/audit.entity';
import { CorrectiveAction } from '../../entities/corrective-action.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateUUID, getCurrentYear } from '../../shared/utils/helpers';
import { FindingSeverity, FindingStatus } from '../../shared/enums';
import { CreateFindingDto, UpdateFindingDto } from './dto/create-finding.dto';

@Injectable()
export class FindingsService {
  constructor(
    @InjectRepository(Finding) private findingRepository: Repository<Finding>,
    @InjectRepository(Audit) private auditRepository: Repository<Audit>,
    @InjectRepository(CorrectiveAction) private actionRepository: Repository<CorrectiveAction>,
    private AuditLogsService: AuditLogsService,
    private notificationsService: NotificationsService,
  ) {}

  private async generateFindingNumber(): Promise<string> {
    const year = getCurrentYear();
    const count = await this.findingRepository.count();
    return `FND-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Get all findings with optional filtering.
   */
  async findAll(options?: {
    auditId?: string;
    status?: FindingStatus;
    severity?: FindingSeverity;
    departmentId?: string;
    search?: string;
  }): Promise<Finding[]> {
    const qb = this.findingRepository.createQueryBuilder('finding')
      .leftJoinAndSelect('finding.audit', 'audit')
      .leftJoinAndSelect('audit.template', 'template')
      .leftJoinAndSelect('finding.responsibleDepartment', 'department')
      .leftJoinAndSelect('finding.responsiblePerson', 'person')
      .leftJoinAndSelect('finding.createdBy', 'createdBy')
      .leftJoinAndSelect('finding.correctiveAction', 'action');

    if (options?.auditId) qb.andWhere('finding.auditId = :auditId', { auditId: options.auditId });
    if (options?.status) qb.andWhere('finding.status = :status', { status: options.status });
    if (options?.severity) qb.andWhere('finding.severity = :severity', { severity: options.severity });
    if (options?.departmentId) qb.andWhere('finding.responsibleDepartmentId = :deptId', { deptId: options.departmentId });
    if (options?.search) {
      qb.andWhere('(finding.description ILIKE :search OR finding.findingNumber ILIKE :search)', { search: `%${options.search}%` });
    }

    qb.orderBy('finding.createdAt', 'DESC');
    return qb.getMany();
  }

  /**
   * Get a single finding.
   */
  async findOne(id: string): Promise<Finding> {
    const finding = await this.findingRepository.findOne({
      where: { id },
      relations: ['audit', 'audit.template', 'audit.department', 'question', 'responsiblePerson', 'responsibleDepartment', 'createdBy', 'correctiveAction'],
    });
        if (!finding) throw new NotFoundException(`Finding with ID ${id} not found`);
    return finding;
  }

  /**
   * Create a new finding.
   */
  async create(dto: CreateFindingDto): Promise<Finding> {
    // Verify the audit exists
    const audit = await this.auditRepository.findOne({ where: { id: dto.auditId } });
    if (!audit) throw new NotFoundException(`Audit with ID ${dto.auditId} not found`);

    const findingNumber = await this.generateFindingNumber();

    const finding = this.findingRepository.create({
      id: generateUUID(),
      findingNumber,
      auditId: dto.auditId,
      questionId: dto.questionId,
      category: dto.category,
      description: dto.description,
      evidence: dto.evidence || [],
      severity: dto.severity,
      responsibleDepartmentId: dto.responsibleDepartmentId,
      responsiblePersonId: dto.responsiblePersonId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      status: FindingStatus.Open,
      createdById: '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
    });

    const saved = await this.findingRepository.save(finding);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'created', 'Finding', saved.id, null,
      { findingNumber: saved.findingNumber, severity: saved.severity, description: saved.description },
    );

    // Notify responsible person
    if (saved.responsiblePersonId) {
      await this.notificationsService.create({
        userId: saved.responsiblePersonId,
        type: 'finding_created' as any,
        title: 'New Finding Created',
        message: `Finding ${saved.findingNumber} has been created: ${saved.description.substring(0, 100)}`,
        relatedId: saved.id,
        relatedType: 'Finding',
      });
    }

    return this.findOne(saved.id);
  }

  /**
   * Update a finding.
   */
  async update(id: string, dto: UpdateFindingDto): Promise<Finding> {
    const finding = await this.findOne(id);
    const oldValues = { status: finding.status, description: finding.description, severity: finding.severity, dueDate: finding.dueDate };

    Object.assign(finding, dto);
    if (dto.dueDate) finding.dueDate = new Date(dto.dueDate);
    finding.updatedAt = new Date();

    const saved = await this.findingRepository.save(finding);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'Finding', saved.id, oldValues,
      { status: saved.status, description: saved.description, severity: saved.severity },
    );

        return this.findOne(id);
  }

  /**
   * Get finding statistics for the dashboard.
   */
  async getStats(): Promise<any> {
    const [total, open, critical, major, minor, observation, overdue, closed] = await Promise.all([
      this.findingRepository.count(),
      this.findingRepository.count({ where: { status: FindingStatus.Open as any } }),
      this.findingRepository.count({ where: { severity: FindingSeverity.Critical } }),
      this.findingRepository.count({ where: { severity: FindingSeverity.Major } }),
      this.findingRepository.count({ where: { severity: FindingSeverity.Minor } }),
      this.findingRepository.count({ where: { severity: FindingSeverity.Observation } }),
      this.findingRepository.count({ where: { status: FindingStatus.Overdue as any } }),
      this.findingRepository.count({ where: { status: FindingStatus.Closed as any } }),
    ]);

    return {
      total,
      open,
      critical,
      major,
      minor,
      observation,
      overdue,
      closed,
        };
  }

  /**
   * Change finding status.
   */
  async changeStatus(id: string, status: FindingStatus): Promise<Finding> {
    const finding = await this.findOne(id);
    const oldStatus = finding.status;
    finding.status = status;
    finding.updatedAt = new Date();

    if (status === FindingStatus.Closed) finding.closedAt = new Date();

    await this.findingRepository.save(finding);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'status_changed', 'Finding', id,
      { status: oldStatus }, { status: status },
    );

    // Notify responsible person for status change
    if (finding.responsiblePersonId && status !== oldStatus) {
      const statusMessages: Record<string, string> = {
        [FindingStatus.Open]: 'Finding is now Open',
        [FindingStatus.ActionAssigned]: 'Finding has been assigned',
        [FindingStatus.InProgress]: 'Finding is now In Progress',
        [FindingStatus.PendingVerification]: 'Finding is pending verification',
        [FindingStatus.Closed]: 'Finding has been Closed',
      };

      await this.notificationsService.create({
        userId: finding.responsiblePersonId,
        type: 'finding_created' as any,
        title: 'Finding Status Changed',
        message: `Finding ${finding.findingNumber} status changed from ${oldStatus} to ${statusMessages[status] || status}`,
        relatedId: finding.id,
        relatedType: 'Finding',
      });
    }

    return this.findOne(id);
  }
}
