import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  protected getTracker(request: Record<string, unknown>): Promise<string> {
    const ip = typeof request.ip === 'string' ? request.ip : 'unknown';
    const path = typeof request.path === 'string' ? request.path : '';
    if (path.endsWith('/auth/login')) {
      const body =
        typeof request.body === 'object' && request.body !== null
          ? (request.body as Record<string, unknown>)
          : undefined;
      const email =
        typeof body?.email === 'string'
          ? body.email.trim().toLowerCase().slice(0, 320)
          : '';
      return Promise.resolve(`${ip}:${email}`);
    }
    const user =
      typeof request.user === 'object' && request.user !== null
        ? (request.user as Record<string, unknown>)
        : undefined;
    return Promise.resolve(typeof user?.id === 'string' ? user.id : ip);
  }
}
