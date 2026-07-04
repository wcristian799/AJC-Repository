import { SetMetadata } from '@nestjs/common';
import { PermissionCode } from './auth.types';

export const PERMISSIONS_KEY = 'ajc:permissions';

export const RequirePermissions = (...permissions: PermissionCode[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
