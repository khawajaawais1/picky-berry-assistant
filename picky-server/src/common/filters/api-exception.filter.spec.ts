import {
  ArgumentsHost,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AuditService } from '../../audit/audit.service';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;
  const recordFailure = jest.fn().mockResolvedValue(undefined);
  const audit = { recordFailure } as unknown as AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('preserves the bbox error code and details in the API envelope', async () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      getHeader: jest.fn().mockReturnValue('request-123'),
    };
    const request = {
      id: 'request-123',
      header: jest.fn().mockReturnValue('request-123'),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    const filter = new ApiExceptionFilter(logger, audit);

    await filter.catch(
      new UnprocessableEntityException({
        error: 'BBOX_TOO_LARGE',
        message: 'Area is too large. Zoom in.',
        details: { max_km: 50, width_km: 55, height_km: 20 },
      }),
      host,
    );

    expect(response.status).toHaveBeenCalledWith(422);
    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'BBOX_TOO_LARGE',
        message: 'Area is too large. Zoom in.',
        details: { max_km: 50, width_km: 55, height_km: 20 },
      },
      request_id: 'request-123',
    });
  });

  it('preserves explicit account and visit error codes', async () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      getHeader: jest.fn().mockReturnValue('request-456'),
    };
    const request = {
      id: 'request-456',
      header: jest.fn().mockReturnValue('request-456'),
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    const filter = new ApiExceptionFilter(logger, audit);

    await filter.catch(
      new UnprocessableEntityException({
        error: 'CONSENT_REQUIRED',
        message: 'Terms and privacy policy consent are required.',
      }),
      host,
    );

    expect(response.json).toHaveBeenCalledWith({
      error: {
        code: 'CONSENT_REQUIRED',
        message: 'Terms and privacy policy consent are required.',
      },
      request_id: 'request-456',
    });
  });

  it('records a rejected privileged attempt with its reason and target', async () => {
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      getHeader: jest.fn().mockReturnValue('request-789'),
    };
    const request = {
      id: 'request-789',
      header: jest.fn().mockReturnValue('request-789'),
      method: 'PATCH',
      originalUrl: '/api/v1/admin/users/user-1/role',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'vitest' },
      user: { id: 'actor-1', role: 'picker' },
      body: { role: 'admin', reason: 'trying to promote myself' },
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
    const filter = new ApiExceptionFilter(logger, audit);

    await filter.catch(new ForbiddenException(), host);

    expect(recordFailure).toHaveBeenCalledWith({
      actorId: 'actor-1',
      action: 'user.role',
      targetType: 'user',
      targetId: 'user-1',
      reason: 'trying to promote myself',
      requestId: 'request-789',
      ip: '127.0.0.1',
      userAgent: 'vitest',
      detail: {
        method: 'PATCH',
        path: '/api/v1/admin/users/user-1/role',
        status: 403,
        code: 'FORBIDDEN',
        requested_role: 'admin',
      },
    });
    expect(response.status).toHaveBeenCalledWith(403);
  });
});
