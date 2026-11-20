import { ValidateIf } from 'class-validator';
import { IsIn, IsString, MinLength } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  @MinLength(1)
  fcm_token!: string;

  @IsIn(['ios', 'android'])
  platform!: 'ios' | 'android';

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsString()
  app_version?: string;
}
