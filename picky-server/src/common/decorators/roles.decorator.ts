import { SetMetadata } from '@nestjs/common';

export type UserRole = 'picker' | 'buyer' | 'admin';
export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
