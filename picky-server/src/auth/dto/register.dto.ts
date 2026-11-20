import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RegistrationConsentsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  terms_version?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  privacy_policy_version?: string;

  @IsOptional()
  @IsBoolean()
  background_location?: boolean;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(10, 128)
  password!: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  nickname?: string;

  @IsOptional()
  @IsIn(['fi', 'en'])
  lang?: 'fi' | 'en';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => RegistrationConsentsDto)
  consents?: RegistrationConsentsDto;
}
