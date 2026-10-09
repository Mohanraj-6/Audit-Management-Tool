import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}