// This interface defines the contract.
// Any database (MongoDB or PostgreSQL) must be able to perform these operations.

import {
  UserEntity,
  PaginatedResult,
} from '../../../../libs/shared/src/entities/index';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface IUserRepository {
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  create(userData: Partial<UserEntity>): Promise<UserEntity>;
  update(id: string, userData: Partial<UserEntity>): Promise<UserEntity>;
  delete(id: string): Promise<UserEntity>;
  findManyWithPagination(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<UserEntity>>;
}
