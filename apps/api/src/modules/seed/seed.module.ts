import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Role,
  User,
  Department,
  Location,
  AuditTemplate,
  TemplateCategory,
  TemplateQuestion,
  Audit,
  AuditAnswer,
  Finding,
  CorrectiveAction,
  Notification,
  Setting,
} from '../../entities';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
import { SharedModule } from '../../shared/shared.module';
import { CurrentUserModule } from '../../shared/current-user/current-user.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    SharedModule,
    CurrentUserModule,
    AuditLogsModule,
    TypeOrmModule.forFeature([
      Role,
      User,
      Department,
      Location,
      AuditTemplate,
      TemplateCategory,
      TemplateQuestion,
      Audit,
      AuditAnswer,
      Finding,
      CorrectiveAction,
      Notification,
      Setting,
    ]),
  ],
  providers: [SeedService],
  controllers: [SeedController],
  exports: [SeedService],
})
export class SeedModule {}
