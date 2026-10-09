/**
 * SharedModule — provides globally available utilities:
 * - ResponseInterceptor (wraps all responses in consistent format)
 * - AllExceptionsFilter (catches and formats all errors)
 */

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [],
})
export class SharedModule {}
