/**
 * Corrective Actions Service — manages corrective actions assigned to findings.
 *
 * Workflow: Open → Assigned → In Progress → Completed → Verification → Closed
 * Only auditors and managers can verify and close actions.
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CorrectiveAction } from '../../entities/corrective-action.entity';
import { Finding } from '../../entities/finding.entity';
import { User } from '../../entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { generateUUID, getCurrentYear } from '../../shared/utils/helpers';
import { ActionStatus, FindingStatus } from '../../shared/enums';
import { CreateCorrectiveActionDto, UpdateCorrectiveActionDto } from './dto/create-corrective-action.dto';

@Injectable()
export class CorrectiveActionsService {
  constructor(
    @InjectRepository(CorrectiveAction) private actionRepository: Repository<CorrectiveAction>,
    @InjectRepository(Finding) private findingRepository: Repository<Finding>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private AuditLogsService: AuditLogsService,
    private notificationsService: NotificationsService,
  ) {}

  private async generateActionNumber(): Promise<string> {
    const year = getCurrentYear();
    const count = await this.actionRepository.count();
    return `CA-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(options?: { status?: ActionStatus; assignedToId?: string; search?: string }): Promise<CorrectiveAction[]> {
    const qb = this.actionRepository.createQueryBuilder('action')
      .leftJoinAndSelect('action.finding', 'finding')
      .leftJoinAndSelect('finding.audit', 'audit')
      .leftJoinAndSelect('action.assignedTo', 'assignedTo')
      .leftJoinAndSelect('action.createdBy', 'createdBy')
      .leftJoinAndSelect('action.verifiedBy', 'verifiedBy');

    if (options?.status) qb.andWhere('action.status = :status', { status: options.status });
    if (options?.assignedToId) qb.andWhere('action.assignedToId = :assignedToId', { assignedToId: options.assignedToId });
    if (options?.search) {
      qb.andWhere('(action.correctiveAction ILIKE :search OR action.actionNumber ILIKE :search)', { search: `%${options.search}%` });
    }
    qb.orderBy('action.createdAt', 'DESC');
    return qb.getMany();
  }

  async findOne(id: string): Promise<CorrectiveAction> {
    const action = await this.actionRepository.findOne({
      where: { id },
      relations: ['finding', 'finding.audit', 'finding.audit.template', 'finding.audit.department',
        'assignedTo', 'createdBy', 'verifiedBy'],
    });
        if (!action) throw new NotFoundException(`Corrective action with ID ${id} not found`);
    return action;
  }

  /**
   * Create a corrective action for a finding.
   */
  async create(dto: CreateCorrectiveActionDto): Promise<CorrectiveAction> {
    const finding = await this.findingRepository.findOne({ where: { id: dto.findingId }, relations: ['audit'] });
    if (!finding) throw new NotFoundException(`Finding with ID ${dto.findingId} not found`);

    const actionNumber = await this.generateActionNumber();

    const action = this.actionRepository.create({
      id: generateUUID(),
      actionNumber,
      findingId: dto.findingId,
      rootCause: dto.rootCause,
      correctiveAction: dto.correctiveAction,
      preventiveAction: dto.preventiveAction,
      assignedToId: dto.assignedToId,
      dueDate: new Date(dto.dueDate),
      evidence: dto.evidence || [],
      status: ActionStatus.Assigned,
      createdById: '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
    });

    const saved = await this.actionRepository.save(action);

    // Update finding status
    finding.status = FindingStatus.ActionAssigned;
    finding.updatedAt = new Date();
    await this.findingRepository.save(finding);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'created', 'CorrectiveAction', saved.id, null,
      { actionNumber: saved.actionNumber, findingId: saved.findingId, status: saved.status },
    );

    // Notify the assigned person
    await this.notificationsService.create({
      userId: dto.assignedToId,
      type: 'action_assigned' as any,
      title: 'Corrective Action Assigned',
      message: `Corrective action ${saved.actionNumber} has been assigned to you.`,
      relatedId: saved.id,
      relatedType: 'CorrectiveAction',
    });

    return this.findOne(saved.id);
  }

  /**
   * Update a corrective action.
   */
  async update(id: string, dto: UpdateCorrectiveActionDto): Promise<CorrectiveAction> {
    const action = await this.findOne(id);
    const oldValues = { status: action.status, correctiveAction: action.correctiveAction, dueDate: action.dueDate };

    Object.assign(action, dto);
    if (dto.dueDate) action.dueDate = new Date(dto.dueDate);
    if (dto.completionDate) action.completionDate = new Date(dto.completionDate);
    action.updatedAt = new Date();

    const saved = await this.actionRepository.save(action);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'CorrectiveAction', id, oldValues,
      { status: saved.status, correctiveAction: saved.correctiveAction },
    );

    return this.findOne(id);
  }

  /**
   * Change corrective action status.
   */
  async changeStatus(id: string, status: ActionStatus): Promise<CorrectiveAction> {
    const action = await this.findOne(id);
    const oldStatus = action.status;
    action.status = status;
    action.updatedAt = new Date();

    if (status === ActionStatus.Completed) action.completionDate = new Date();

    await this.actionRepository.save(action);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'status_changed', 'CorrectiveAction', id,
      { status: oldStatus }, { status },
    );

    return this.findOne(id);
  }

  /**
   * Submit a corrective action for verification.
   */
  async submitForVerification(id: string, evidence?: any[]): Promise<CorrectiveAction> {
    const action = await this.findOne(id);
    const oldStatus = action.status;

    action.status = ActionStatus.Verification;
    action.completionDate = action.completionDate || new Date();
    if (evidence && evidence.length) action.evidence = [...(action.evidence || []), ...evidence];
    action.updatedAt = new Date();

    await this.actionRepository.save(action);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'status_changed', 'CorrectiveAction', id,
      { status: oldStatus }, { status: ActionStatus.Verification },
    );

    // Notify auditor/manager to verify
    await this.notificationsService.create({
      userId: '5b094623-a5cf-4cf0-9ccf-e5788478fee4',
      type: 'action_submitted_for_verification' as any,
      title: 'Corrective Action Submitted for Verification',
      message: `Corrective action ${action.actionNumber} has been submitted for verification.`,
      relatedId: action.id,
      relatedType: 'CorrectiveAction',
    });

    return this.findOne(id);
  }

  /**
   * Verify and close a corrective action (auditor/manager only).
   */
  async verify(id: string, comments?: string): Promise<CorrectiveAction> {
    const action = await this.findOne(id);
    if (action.status !== ActionStatus.Verification) {
      throw new BadRequestException('Only actions in Verification status can be verified');
    }

    const oldStatus = action.status;
    action.status = ActionStatus.Closed;
    action.verificationComments = comments || '';
    action.verifiedById = '5b094623-a5cf-4cf0-9ccf-e5788478fee4';
    action.closedAt = new Date();
    action.updatedAt = new Date();

    await this.actionRepository.save(action);

    await this.AuditLogsService.logAction(
      '5b094623-a5cf-4cf0-9ccf-e5788478fee4', 'updated', 'CorrectiveAction', id,
      { status: oldStatus }, { status: ActionStatus.Closed, verifiedById: action.verifiedById },
    );

    // Update finding status to Closed
    const finding = await this.findingRepository.findOne({ where: { id: action.findingId } });
    if (finding) {
      finding.status = FindingStatus.Closed;
      finding.closedAt = new Date();
      finding.updatedAt = new Date();
      await this.findingRepository.save(finding);
    }

    // Notify assigned person
    await this.notificationsService.create({
      userId: action.assignedToId,
      type: 'action_assigned' as any,
      title: 'Corrective Action Closed',
      message: `Corrective action ${action.actionNumber} has been verified and closed.`,
      relatedId: action.id,
      relatedType: 'CorrectiveAction',
    });

    return this.findOne(id);
  }

  /**
   * Get corrective action statistics.
   */
  async getStats(): Promise<any> {
    const [total, open, inProgress, completed, verification, closed, overdue] = await Promise.all([
      this.actionRepository.count(),
      this.actionRepository.count({ where: { status: ActionStatus.Open } }),
      this.actionRepository.count({ where: { status: ActionStatus.InProgress } }),
      this.actionRepository.count({ where: { status: ActionStatus.Completed } }),
      this.actionRepository.count({ where: { status: ActionStatus.Verification } }),
      this.actionRepository.count({ where: { status: ActionStatus.Closed } }),
      this.actionRepository.count({ where: { status: ActionStatus.Overdue } }),
    ]);

    return { total, open, inProgress, completed, verification, closed, overdue };
  }
}


