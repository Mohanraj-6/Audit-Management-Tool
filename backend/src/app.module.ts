import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/config.schema';

// Shared
import { SharedModule } from './shared/shared.module';
import { CurrentUserModule } from './shared/current-user/current-user.module';

// Feature modules
import { UsersModule } from './modules/users/users.module';
import { DepartmentModule } from './modules/departments/departments.module';
import { LocationModule } from './modules/locations/locations.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { AuditsModule } from './modules/audits/audits.module';
import { FindingsModule } from './modules/findings/findings.module';
import { CorrectiveActionsModule } from './modules/corrective-actions/corrective-actions.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MailModule } from './modules/mail/mail.module';
import { SeedModule } from './modules/seed/seed.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [databaseConfig],
      cache: true,
      envFilePath: [
        '.env',
        // Compiled output lives in apps/api/dist/src, so walk up to the repo root
        // (../../../../ from dist/src, ../../../ from dist).
        join(__dirname, '../../../../.env'),
        join(__dirname, '../../../.env'),
        // CWD-relative fallbacks (npm scripts run with CWD=apps/api, or the repo root).
        '../../.env',
        '../../../.env',
      ],
      expandVariables: true,
    }),

    // Database — synchronize=true for local dev (uses migrations in production)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [join(__dirname, '**', '*.entity.{ts,js}')],
        synchronize: true,
        logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
        ssl: process.env.NODE_ENV === 'production',
        extra: {
          timezone: 'utc',
        },
      }),
    }),

        // Shared
    SharedModule,
    CurrentUserModule,

    // Feature modules
    UsersModule,
    DepartmentModule,
    LocationModule,
    TemplatesModule,
    AuditsModule,
    FindingsModule,
    CorrectiveActionsModule,
    ReportsModule,
    NotificationsModule,
    AuditLogsModule,
    UploadsModule,
    SettingsModule,
    MailModule,
    SeedModule,
  ],
})
export class AppModule {}

