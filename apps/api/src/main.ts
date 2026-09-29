import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Increase payload limit for file uploads (50MB)
    bodyParser: true,
    rawBody: false,
  });
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [ "'self'" ],
          styleSrc: [ "'self'", "'unsafe-inline'" ],
          imgSrc: [ "'self'", 'data:', 'http:', 'https:' ],
          scriptSrc: [ "'self'" ],
          fontSrc: [ "'self'", 'https:', 'data:' ],
          connectSrc: [ "'self'" ],
          frameSrc: [ "'self'" ],
        },
      },
    }) as any,
  );

  // Rate limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 10000, // Increased for local dev
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // Serve static uploaded files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix for API
  app.setGlobalPrefix('api');

  // OpenAPI documentation → http://localhost:4000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Audit Management System API')
    .setDescription('REST API for the internal Audit Management System')
    .setVersion('1.0.0')
    .addTag('audits')
    .addTag('findings')
    .addTag('corrective-actions')
    .addTag('templates')
    .addTag('reports')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument, {
    swaggerOptions: { persistAuthorization: true },
  });

  // Enable CORS for local development
  app.enableCors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  });

  const port = process.env.API_PORT || 4000;
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Audit Management System API running on http://0.0.0.0:${port}/api`);
}
bootstrap();

