import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Sets required roles for a route. Used by RolesGuard.
 * If no @Roles() is set, the route is accessible to any authenticated user.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
