export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordHash: string;
}

export abstract class UsersRepository {
  abstract findByEmail(email: string): Promise<UserRecord | null>;
}
