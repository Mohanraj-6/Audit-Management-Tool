import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Finding } from '../../entities/finding.entity';
import { Audit } from '../../entities/audit.entity';
import { TemplateQuestion } from '../../entities/template-question.entity';
import { User } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { CorrectiveAction } from '../../entities/corrective-action.entity';
import { FindingsService } from './findings.service';
import { FindingsController } from './findings.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    SharedModule,
    AuditLogsModule,
    NotificationsModule,
        TypeOrmModule.forFeature([Finding, Audit, CorrectiveAction, TemplateQuestion, User, Department]),
  ],
  providers: [FindingsService],
  controllers: [FindingsController],
  exports: [FindingsService],
})
export class FindingsModule {}