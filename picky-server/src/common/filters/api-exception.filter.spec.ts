import { ArgumentsHost, UnprocessableEntityException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ApiExceptionFilter } from './api-exception.filter';

describe('ApiExceptionFilter', () => {
  const logger = {
    setContext: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  it('preserves the bbox error code and details in the API envelope', () => {
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
    const filter = new ApiExceptionFilter(logger);

    filter.catch(
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

  it('preserves explicit account and visit error codes', () => {
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
    const filter = new ApiExceptionFilter(logger);

    filter.catch(
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
});
