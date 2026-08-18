import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Extract roles passed to @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If method has no @Roles decorator, access is open
    if (!requiredRoles) {
      return true;
    }

    // Get user saved in req.user by JwtStrategy
    const { user } = context.switchToHttp().getRequest();

    // Check if user has required role
    const hasRole = requiredRoles.includes(user?.role);

    if (!hasRole) {
      throw new ForbiddenException(
        'You do not have sufficient permissions to perform this action',
      );
    }

    return true;
  }
}
