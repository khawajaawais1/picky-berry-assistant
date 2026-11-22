import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Request, Response } from 'express';
import { AuditService } from '../../audit/audit.service';

type AuditedRequest = Omit<Request, 'body'> & {
  id?: string;
  user?: { id: string; role: string };
  body?: { reason?: unknown; role?: unknown; zone_id?: unknown };
};

interface FailedAttempt {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  ip: string | null;
  userAgent: string | null;
  detail: Record<string, unknown>;
}

function requestPathOf(request: AuditedRequest): string {
  return (request.originalUrl ?? request.url ?? '').split('?')[0];
}

function failedAttemptOf(
  request: AuditedRequest,
  path: string,
  status: number,
  code: string,
): FailedAttempt | null {
  const actorId = request.user?.id;
  if (!actorId || !path.includes('/admin/')) return null;
  if (status !== 403 && status !== 409) return null;

  const body = request.body ?? {};
  const method = request.method.toUpperCase();
  const userMatch = path.match(/\/admin\/users\/([^/]+)/);
  const jobMatch = path.match(/\/admin\/jobs\/([^/]+)\/retry/);
  const isRoleChange = path.endsWith('/role');
  const isRevoke = path.endsWith('/revoke-sessions');
  const isRetry = path.endsWith('/retry');
  const isRecompute = path.endsWith('/scores/recompute');

  const action = isRetry
    ? 'job.retry'
    : isRevoke
      ? 'user.sessions_revoke'
      : isRoleChange
        ? 'user.role'
        : isRecompute
          ? 'scores.recompute'
          : `admin.${method.toLowerCase()}`;
  const targetType = userMatch
    ? 'user'
    : jobMatch
      ? 'job'
      : isRecompute
        ? 'scores'
        : 'admin';
  const targetId =
    userMatch?.[1] ??
    jobMatch?.[1] ??
    (typeof body.zone_id === 'string' ? body.zone_id : null);
  const reason =
    typeof body.reason === 'string' && body.reason.trim().length >= 3
      ? body.reason.trim()
      : null;
  const detail: Record<string, unknown> = {
    method,
    path,
    status,
    code,
  };
  if (typeof body.role === 'string') detail.requested_role = body.role;
  if (typeof body.zone_id === 'string') detail.zone_id = body.zone_id;

  const userAgent = request.headers['user-agent'];
  return {
    actorId,
    action,
    targetType,
    targetId,
    reason,
    ip: request.ip ?? null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    detail,
  };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly logger: PinoLogger,
    private readonly audit: AuditService,
  ) {
    this.logger.setContext(ApiExceptionFilter.name);
  }

  async catch(exception: unknown, host: ArgumentsHost): Promise<void> {
    const http = host.switchToHttp();
    const request = http.getRequest<AuditedRequest>();
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
    // Express's unmatched-route 404 reaches us as Nest's `Cannot <METHOD> <url>`. Give it
    // its own code so a client can tell "this API is not deployed here" from "this record
    // does not exist".
    const routeMissing =
      status === 404 &&
      body?.message ===
        `Cannot ${request.method} ${request.originalUrl ?? request.url}`;
    const code = routeMissing
      ? 'ROUTE_NOT_FOUND'
      : this.errorCode(status, body?.error);
    const message = routeMissing
      ? 'This API endpoint is not available on this server.'
      : status >= 500
        ? 'An unexpected error occurred.'
        : this.errorMessage(status, body?.message);
    const responseRequestId = response.getHeader('x-request-id');
    const requestId =
      request.id ??
      request.header('x-request-id') ??
      (typeof responseRequestId === 'string' ? responseRequestId : 'unknown');

    const failed = failedAttemptOf(
      request,
      requestPathOf(request),
      status,
      code,
    );
    if (failed) {
      try {
        await this.audit.recordFailure({
          ...failed,
          requestId,
        });
      } catch (auditError) {
        this.logger.error(
          { err: auditError, request_id: requestId },
          'Failed to record a rejected privileged attempt',
        );
      }
    }

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
