// Этот интерфейс диктует контракт.
// Любая база данных (Mongo или Postgres) должна уметь делать эти вещи.

export const USER_REPOSITORY = 'USER_REPOSITORY'; // Токен для DI

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
