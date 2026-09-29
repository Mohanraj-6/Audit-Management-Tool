import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from '../../entities/location.entity';
import { Department } from '../../entities/department.entity';
import { LocationsService } from './locations.service';
import { LocationsController } from './locations.controller';
import { SharedModule } from '../../shared/shared.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';

@Module({
  imports: [
    SharedModule,
    AuditLogsModule,
    TypeOrmModule.forFeature([Location, Department]),
  ],
  providers: [LocationsService],
  controllers: [LocationsController],
  exports: [LocationsService],
})
export class LocationModule {}