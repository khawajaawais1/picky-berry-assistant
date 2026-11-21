import { IsEmail, IsString, Length, MinLength } from 'class-validator';

/** `POST /auth/password-reset`: the address to send a reset link to. */
export class RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}

/** `POST /auth/password-reset/confirm`: the token from the link, and the new password. */
export class ConfirmPasswordResetDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @Length(10, 128)
  password!: string;
}
