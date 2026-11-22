import { Transform } from 'class-transformer';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { USER_ROLES, UserRole } from './users-query.dto';

export class UpdateRoleDto {
  @IsIn(USER_ROLES)
  role!: UserRole;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  reason!: string;
}
