import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ApiExceptionFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();
    const exceptionStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const status = exceptionStatus === 400 ? 422 : exceptionStatus;
    const responseBody =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const body =
      typeof responseBody === 'object' && responseBody !== null
        ? (responseBody as {
            message?: unknown;
            error?: unknown;
            details?: unknown;
          })
        : undefined;
    const code = this.errorCode(status, body?.error);
    const message =
      status >= 500
        ? 'An unexpected error occurred.'
        : this.errorMessage(status, body?.message);
    const responseRequestId = response.getHeader('x-request-id');
    const requestId =
      request.id ??
      request.header('x-request-id') ??
      (typeof responseRequestId === 'string' ? responseRequestId : 'unknown');

    if (status >= 500) {
      this.logger.error(
        { err: exception, request_id: requestId },
        'Unhandled API exception',
      );
    } else {
      this.logger.warn(
        { status, request_id: requestId, code },
        'API request rejected',
      );
    }

    response.status(status).json({
      error: {
        code,
        message,
        ...(body?.details === undefined ? {} : { details: body.details }),
      },
      request_id: requestId,
    });
  }

  private errorCode(status: number, nestError: unknown): string {
    if (
      typeof nestError === 'string' &&
      /^[A-Z][A-Z0-9_]{1,63}$/.test(nestError)
    ) {
      return nestError;
    }
    if (status === 422) return 'VALIDATION_ERROR';
    if (status === 401) return 'UNAUTHORIZED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    if (status === 409) return 'CONFLICT';
    if (status === 429) return 'RATE_LIMITED';
    return status >= 500 ? 'INTERNAL' : 'VALIDATION_ERROR';
  }

  private errorMessage(status: number, message: unknown): string {
    if (status === 401) return 'Authentication is required.';
    if (status === 403)
      return 'You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource was not found.';
    if (status === 429) return 'Too many requests. Try again later.';
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
    return 'The request could not be processed.';
  }
}
