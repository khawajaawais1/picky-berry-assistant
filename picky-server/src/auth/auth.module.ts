import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { AuthController } from './auth.controller';
import { MeController } from './me.controller';
import { AuthService } from './auth.service';
import { MailService } from './mail.service';
import { PasswordService } from './password.service';
import { ProfileService } from './profile.service';
import { SpeciesModule } from '../species/species.module';

@Module({
  imports: [
    SpeciesModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { algorithm: 'HS256' as const },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    AuthService,
    MailService,
    PasswordService,
    ProfileService,
    { provide: APP_GUARD, useExisting: JwtAuthGuard },
    { provide: APP_GUARD, useExisting: RolesGuard },
  ],
  exports: [JwtModule, AuthService, ProfileService],
})
export class AuthModule {}
