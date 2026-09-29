/**
 * Reports Module — generates PDF and Excel reports for audits.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audit } from '../../entities/audit.entity';
import { Finding } from '../../entities/finding.entity';
import { CorrectiveAction } from '../../entities/corrective-action.entity';
import { AuditAnswer } from '../../entities/audit-answer.entity';
import { AuditTemplate } from '../../entities/audit-template.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    SharedModule,
    AuditLogsModule,
    TypeOrmModule.forFeature([Audit, Finding, CorrectiveAction, AuditAnswer, AuditTemplate]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}