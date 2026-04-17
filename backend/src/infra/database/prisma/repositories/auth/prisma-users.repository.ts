import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { UsersRepository, type UserRecord } from "@/domain/auth/application/repositories/users.repository";

@Injectable()
export class PrismaUsersRepository extends UsersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordHash: user.password,
    };
  }
}
