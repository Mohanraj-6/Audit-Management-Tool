import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { CurrentUserModule } from '../../shared/current-user/current-user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, Role, Department } from '../../entities';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuditLogsModule } from '../../modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    SharedModule,
    CurrentUserModule,
    AuditLogsModule,
    TypeOrmModule.forFeature([User, Role, Department]),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}