/**
 * Notifications Service — manages user notifications.
 * Notifications are created by other services when events occur.
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationType } from '../../shared/enums';
import { generateUUID } from '../../shared/utils/helpers';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Create a notification for a user.
   */
  async create(params: CreateNotificationParams): Promise<Notification> {
    const notification = this.notificationRepository.create({
      id: generateUUID(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      isRead: false,
      relatedId: params.relatedId,
      relatedType: params.relatedType,
      metadata: params.metadata,
    });
    return this.notificationRepository.save(notification);
  }

  /**
   * Create notifications for multiple users at once.
   */
  async createBulk(params: CreateNotificationParams[]): Promise<Notification[]> {
    const notifications = params.map((p) =>
      this.notificationRepository.create({
        id: generateUUID(),
        userId: p.userId,
        type: p.type,
        title: p.title,
        message: p.message,
        isRead: false,
        relatedId: p.relatedId,
        relatedType: p.relatedType,
        metadata: p.metadata,
      }),
    );
    return this.notificationRepository.save(notifications);
  }

  /**
   * Get notifications for a user.
   */
  async findByUser(userId: string, unreadOnly: boolean = false): Promise<Notification[]> {
    const options: FindManyOptions<Notification> = {
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      order: { createdAt: 'DESC' },
    };
    return this.notificationRepository.find(options);
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(id: string): Promise<Notification> {
    await this.notificationRepository.update(id, { isRead: true });
    return (await this.notificationRepository.findOne({
      where: { id },
    })) as Notification;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllRead(userId: string): Promise<void> {
    await this.notificationRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  /**
   * Get unread count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.count({ where: { userId, isRead: false } });
  }

  /**
   * Delete a notification.
   */
  async remove(id: string): Promise<void> {
    await this.notificationRepository.delete(id);
  }
}
