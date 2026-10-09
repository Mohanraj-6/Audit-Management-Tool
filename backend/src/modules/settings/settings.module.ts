import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from '../../entities/setting.entity';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [SharedModule, AuditLogsModule, TypeOrmModule.forFeature([Setting])],
  providers: [SettingsService],
  controllers: [SettingsController],
  exports: [SettingsService],
})
export class SettingsModule {}