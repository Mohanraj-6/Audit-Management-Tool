import { Controller, Get, Patch, Param, Query, Delete } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for a user' })
  @ApiQuery({ name: 'userId', required: true })
  @ApiQuery({ name: 'unreadOnly', required: false })
  async findByUser(@Query('userId') userId: string, @Query('unreadOnly') unreadOnly?: string) {
    return this.notificationsService.findByUser(userId, unreadOnly === 'true');
  }

  @Get('count/:userId')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Param('userId') userId: string) {
    return { count: await this.notificationsService.getUnreadCount(userId) };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all/:userId')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@Param('userId') userId: string) {
    await this.notificationsService.markAllRead(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(@Param('id') id: string) {
    await this.notificationsService.remove(id);
  }
}