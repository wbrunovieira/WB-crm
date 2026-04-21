export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
}

export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<UserRecord | null>;
  abstract findAll(): Promise<UserRecord[]>;
  abstract findById(id: string): Promise<UserRecord | null>;
  abstract create(data: { id: string; name: string; email: string; passwordHash: string }): Promise<UserRecord>;
}
