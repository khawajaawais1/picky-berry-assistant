import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthUser } from './auth-user.interface';
import { AuthService } from './auth.service';
import { DeleteAccountDto } from './dto/delete-account.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { UpdatePrivacyDto } from './dto/update-privacy.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

type AuthenticatedRequest = Request & { user: AuthUser };

@Controller('me')
export class MeController {
  constructor(
    private readonly profile: ProfileService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  get(@Req() request: AuthenticatedRequest): Promise<Record<string, unknown>> {
    return this.profile.getProfile(request.user.id);
  }

  @Patch()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  update(
    @Body() input: UpdateProfileDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.profile.updateProfile(request.user.id, input);
  }

  @Patch('privacy')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  updatePrivacy(
    @Body() input: UpdatePrivacyDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.profile.updatePrivacy(request.user.id, input);
  }

  @Post('devices')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async registerDevice(
    @Body() input: RegisterDeviceDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.profile.registerDevice(request.user.id, input);
  }

  @Post('export')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  export(
    @Req() request: AuthenticatedRequest,
  ): Promise<Record<string, unknown>> {
    return this.profile.exportData(request.user.id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async delete(
    @Body() input: DeleteAccountDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<void> {
    await this.auth.deleteAccount(request.user.id, input);
  }
}
