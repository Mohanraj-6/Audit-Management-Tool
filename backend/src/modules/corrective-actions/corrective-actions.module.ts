import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Finding } from '../../entities/finding.entity';
import { Audit } from '../../entities/audit.entity';
import { CorrectiveAction } from '../../entities/corrective-action.entity';
import { User } from '../../entities/user.entity';
import { CorrectiveActionsService } from './corrective-actions.service';
import { CorrectiveActionsController } from './corrective-actions.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    SharedModule,
    AuditLogsModule,
    NotificationsModule,
    TypeOrmModule.forFeature([Finding, Audit, CorrectiveAction, User]),
  ],
  providers: [CorrectiveActionsService],
  controllers: [CorrectiveActionsController],
  exports: [CorrectiveActionsService],
})
export class CorrectiveActionsModule {}