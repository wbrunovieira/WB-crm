import { Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { left, right, type Either } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { UsersRepository } from "../repositories/users.repository";

interface Input {
  name: string;
  email: string;
  password: string;
}

type Output = Either<Error, { id: string; name: string; email: string }>;

export class UserAlreadyExistsError extends Error {
  constructor() { super("Usuário já existe com este email"); this.name = "UserAlreadyExistsError"; }
}

@Injectable()
export class RegisterUserUseCase {
  constructor(private readonly users: UsersRepository) {}

  async execute({ name, email, password }: Input): Promise<Output> {
    const existing = await this.users.findByEmail(email);
    if (existing) return left(new UserAlreadyExistsError());

    const passwordHash = await bcrypt.hash(password, 10);
    const id = new UniqueEntityID().toString();
    const user = await this.users.create({ id, name, email, passwordHash });
    return right({ id: user.id, name: user.name, email: user.email });
  }
}
