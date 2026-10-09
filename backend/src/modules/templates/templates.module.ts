import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditTemplate } from '../../entities/audit-template.entity';
import { TemplateCategory } from '../../entities/template-category.entity';
import { TemplateQuestion } from '../../entities/template-question.entity';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    SharedModule,
    AuditLogsModule,
    TypeOrmModule.forFeature([AuditTemplate, TemplateCategory, TemplateQuestion]),
  ],
  providers: [TemplatesService],
  controllers: [TemplatesController],
  exports: [TemplatesService],
})
export class TemplatesModule {}