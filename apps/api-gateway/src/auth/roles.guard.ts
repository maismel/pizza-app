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
    // Извлекаем роли, переданные в декоратор @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Если у метода нет декоратора @Roles, доступ открыт
    if (!requiredRoles) {
      return true;
    }

    // Достаем пользователя, сохраненного в req.user с помощью JwtStrategy
    const { user } = context.switchToHttp().getRequest();

    // Проверяем наличие нужной роли у пользователя
    const hasRole = requiredRoles.includes(user?.role);

    if (!hasRole) {
      throw new ForbiddenException(
        'У вас недостаточно прав для выполнения этой операции',
      );
    }

    return true;
  }
}
