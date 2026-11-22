import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export const USER_ROLES = ['picker', 'buyer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export class UsersQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;
}
