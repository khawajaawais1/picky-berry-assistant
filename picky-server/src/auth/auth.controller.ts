import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthUser } from './auth-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  ConfirmPasswordResetDto,
  RequestPasswordResetDto,
} from './dto/password-reset.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(
    @Body() input: RegisterDto,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    return this.auth.register(input, request.header('user-agent'));
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  login(
    @Body() input: LoginDto,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    return this.auth.login(input, request.header('user-agent'));
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  refresh(
    @Body() input: RefreshDto,
    @Req() request: Request,
  ): Promise<Record<string, unknown>> {
    return this.auth.refresh(input, request.header('user-agent'));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async logout(
    @Body() input: RefreshDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.auth.logout(request.user.id, input);
  }

  /** Always 202 with no body: the answer cannot reveal whether an account exists. */
  @Post('password-reset')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestPasswordReset(
    @Body() input: RequestPasswordResetDto,
  ): Promise<void> {
    await this.auth.requestPasswordReset(input);
  }

  @Post('password-reset/confirm')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async confirmPasswordReset(
    @Body() input: ConfirmPasswordResetDto,
  ): Promise<void> {
    await this.auth.confirmPasswordReset(input);
  }

  @Post('verify-email')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async verifyEmail(@Body() input: VerifyEmailDto): Promise<void> {
    await this.auth.verifyEmail(input);
  }
}
