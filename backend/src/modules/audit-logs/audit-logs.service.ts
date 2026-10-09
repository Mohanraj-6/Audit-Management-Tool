/**
 * Audit Logs Service — creates and retrieves audit log entries.
 * Every important action (create, update, delete, status change)
 * is logged here with old/new values.
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditLogActionType } from '../../shared/enums';
import { generateUUID } from '../../shared/utils/helpers';

export interface LogActionParams {
  userId: string;
  action: AuditLogActionType | string;
  recordType: string;
  recordId?: string | null;
  description: string;
  oldValue?: Record<string, any> | null;
  newValue?: Record<string, any> | null;
  ipAddress?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Log an action to the audit trail.
   *
   * The signature is deliberately tolerant: some services pass a human
   * readable description, others pass `null` and only the new value. When the
   * description is missing a default ("created Audit") is generated, and when
   * only one object is provided it is treated as the new value.
   */
  async logAction(
    userId: string,
    action: AuditLogActionType | string,
    recordType: string,
    recordId: string | null,
    description?: string | Record<string, any> | null,
    oldValue?: Record<string, any> | null,
    newValue?: Record<string, any> | null,
    ipAddress?: string,
  ): Promise<AuditLog> {
    let resolvedDescription: string | null = typeof description === 'string' ? description : null;
    let resolvedOld = oldValue ?? null;
    let resolvedNew = newValue ?? null;

    // Some call sites pass only the new value as the fifth argument, others
    // pass `null` plus the new value as the sixth. Normalise both patterns:
    if (description && typeof description === 'object') {
      if (resolvedOld && !resolvedNew) {
        resolvedNew = resolvedOld; // fifth arg was the new value
        resolvedOld = null;
      } else if (!resolvedOld && !resolvedNew) {
        resolvedNew = description;
      }
    } else if (resolvedOld && !resolvedNew) {
      // logAction(user, action, type, id, null, { ...newValues })
      resolvedNew = resolvedOld;
      resolvedOld = null;
    }

    if (!resolvedDescription) {
      resolvedDescription = `${String(action).replace(/_/g, ' ')} ${recordType}`;
    }

    const log = new AuditLog();
    log.id = generateUUID();
    log.userId = userId || null;
    log.action = action as AuditLogActionType;
    log.recordType = recordType;
    log.recordId = recordId || null;
    log.description = resolvedDescription;
    log.oldValue = resolvedOld;
    log.newValue = resolvedNew;
    log.ipAddress = ipAddress || null;

    try {
      return await this.auditLogRepository.save(log);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to write audit log: ${message}`, stack);
      return log;
    }
  }

  /**
   * Convenience method for common log patterns.
   */
  async log(params: LogActionParams): Promise<AuditLog> {
    return this.logAction(
      params.userId,
      params.action,
      params.recordType,
      params.recordId || null,
      params.description,
      params.oldValue || null,
      params.newValue || null,
      params.ipAddress,
    );
  }

  /**
   * Get all audit logs with optional filtering.
   */
  async findAll(options?: {
    userId?: string;
    action?: string;
    recordType?: string;
    recordId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<AuditLog[]> {
    const where: any = {};

    if (options?.userId) where.userId = options.userId;
    if (options?.action) where.action = options.action;
    if (options?.recordType) where.recordType = options.recordType;
    if (options?.recordId) where.recordId = options.recordId;
    if (options?.dateFrom || options?.dateTo) {
      where.createdAt = {};
      if (options.dateFrom) where.createdAt.gte = new Date(options.dateFrom);
      if (options.dateTo) where.createdAt.lte = new Date(options.dateTo);
    }

    return this.auditLogRepository.find({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: ((options?.page || 1) - 1) * (options?.limit || 50),
      take: options?.limit || 50,
    });
  }

  /**
   * Get the count of audit logs (for pagination meta).
   */
  async count(options?: { action?: string; recordType?: string; userId?: string }): Promise<number> {
    const where: any = {};
    if (options?.action) where.action = options.action;
    if (options?.recordType) where.recordType = options.recordType;
    if (options?.userId) where.userId = options.userId;
    return this.auditLogRepository.count({ where });
  }
}
