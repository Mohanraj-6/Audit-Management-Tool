/**
 * Environment configuration schema and validation.
 * Uses class-validator to validate environment variables at startup.
 */

import { plainToInstance } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsInt()
  @Min(0)
  @IsOptional()
  API_PORT: number = 4000;

  @IsString()
  @IsOptional()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  REDIS_URL: string;

  @IsString()
  @IsOptional()
  MINIO_ENDPOINT: string;

  @IsString()
  @IsOptional()
  MINIO_BUCKET: string;

  @IsString()
  @IsOptional()
  MINIO_ROOT_USER: string;

  @IsString()
  @IsOptional()
  MINIO_ROOT_PASSWORD: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string;

  // ─── Email / SMTP (optional — see MailService) ──────────────────────
  @IsString()
  @IsOptional()
  SMTP_HOST: string;

  @IsString()
  @IsOptional()
  SMTP_PORT: string;

  @IsString()
  @IsOptional()
  SMTP_SECURE: string;

  @IsString()
  @IsOptional()
  SMTP_USER: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD: string;

  /** Envelope sender. When empty, mail is sent from the auditor's address. */
  @IsString()
  @IsOptional()
  MAIL_FROM: string;

  @IsString()
  @IsOptional()
  MAIL_COMPANY_NAME: string;

  @IsString()
  @IsOptional()
  MAIL_OUTBOX_DIR: string;

  /** Base URL of the web app, used for links inside emails. */
  @IsString()
  @IsOptional()
  WEB_APP_URL: string;
}

/**
 * Validates environment variables. Called in main.ts bootstrap
 * and also as validationSchema in ConfigModule.
 */
export const validateEnv = (config: Record<string, unknown>) => {
  const finalConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(finalConfig, {
    forbidUnknownValues: false,
  });

  if (errors.length > 0) {
    throw new Error(`Environment validation error: ${errors.toString()}`);
  }
  return finalConfig;
};

