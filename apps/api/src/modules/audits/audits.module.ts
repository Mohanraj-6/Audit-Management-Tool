import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit } from '../../entities/audit.entity';
import { AuditAssignee } from '../../entities/audit-assignee.entity';
import { AuditAnswer } from '../../entities/audit-answer.entity';
import { Finding } from '../../entities/finding.entity';
import { AuditTemplate } from '../../entities/audit-template.entity';
import { TemplateQuestion } from '../../entities/template-question.entity';
import { User } from '../../entities/user.entity';
import { AuditsService } from './audits.service';
import { AuditsController } from './audits.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
        SharedModule,
    AuditLogsModule,
    NotificationsModule,
    MailModule,
    TypeOrmModule.forFeature([
      Audit,
      AuditAssignee,
      AuditAnswer,
      Finding,
      AuditTemplate,
      TemplateQuestion,
      User,
    ]),
  ],
  providers: [AuditsService],
  controllers: [AuditsController],
  exports: [AuditsService],
})
export class AuditsModule {}