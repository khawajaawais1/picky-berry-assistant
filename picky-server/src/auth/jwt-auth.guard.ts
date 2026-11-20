import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser } from './auth-user.interface';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { UserRole } from '../common/decorators/roles.decorator';

type AuthenticatedRequest = Request & { user?: AuthUser };

const validRoles: readonly UserRole[] = ['picker', 'buyer', 'admin'];

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.config.get<boolean>('DEV_AUTH_BYPASS')) {
      request.user = {
        id: '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      return true;
    }

    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer '))
      throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<{
        sub?: string;
        role?: string;
      }>(authorization.slice('Bearer '.length), { algorithms: ['HS256'] });
      if (
        !payload.sub ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          payload.sub,
        ) ||
        !validRoles.includes(payload.role as UserRole)
      ) {
        throw new UnauthorizedException();
      }
      request.user = { id: payload.sub, role: payload.role as UserRole };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
