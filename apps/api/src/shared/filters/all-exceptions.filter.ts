/**
 * HTTP Exception Filter — catches all exceptions and returns a consistent error format.
 *
 * Error format:
 * {
 *   success: false,
 *   message: "Error message",
 *   statusCode: 400,
 *   error: "Bad Request",
 *   timestamp: "...",
 *   path: "/api/..."
 * }
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = 500;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        error = exception.message;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || resObj.error || exception.message;
        error = resObj.error || exception.message;
        details = resObj.details || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = 'Error';
    }

    // Log server errors
    if (status >= 500) {
      this.logger.error(
        `Exception: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      message,
      error,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      details,
    });
  }
}
