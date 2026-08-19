import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Decorator stores array of allowed roles in route metadata
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
