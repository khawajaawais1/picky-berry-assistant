import { UserRole } from '../common/decorators/roles.decorator';

export interface AuthUser {
  id: string;
  role: UserRole;
}
