// This interface defines the contract.
// Any database (MongoDB or PostgreSQL) must be able to perform these operations.

export const USER_REPOSITORY = 'USER_REPOSITORY'; // DI Token

export interface IUserRepository {
  findById(id: string): Promise<any>;
  findByEmail(email: string): Promise<any>;
  create(userData: any): Promise<any>;
  update(id: string, userData: any): Promise<any>;
  delete(id: string): Promise<any>;
  findManyWithPagination(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<any>;
}
