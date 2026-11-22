import { IsIn } from 'class-validator';
import { USER_ROLES, UserRole } from './users-query.dto';

export class UpdateRoleDto {
  @IsIn(USER_ROLES)
  role!: UserRole;
}
