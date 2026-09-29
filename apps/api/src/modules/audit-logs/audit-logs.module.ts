/**
 * Audit Logs Module — provides an immutable, append-only audit trail.
 * This module has NO upstream dependencies (no circular dependency risk).
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../../entities/audit-log.entity';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule, TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogsService],
  controllers: [AuditLogsController],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}