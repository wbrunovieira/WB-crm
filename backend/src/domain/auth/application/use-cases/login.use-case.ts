import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { left, right, type Either } from "@/core/either";
import { UsersRepository } from "../repositories/users.repository";

interface Input {
  email: string;
  password: string;
}

type Output = Either<Error, { accessToken: string }>;

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
  ) {}

  async execute({ email, password }: Input): Promise<Output> {
    const user = await this.users.findByEmail(email);
    if (!user) return left(new Error("Credenciais inválidas"));

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return left(new Error("Credenciais inválidas"));

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return right({ accessToken });
  }
}
