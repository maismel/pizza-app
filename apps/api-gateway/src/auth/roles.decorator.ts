import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Декоратор сохраняет массив разрешенных ролей в метаданных маршрута
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
