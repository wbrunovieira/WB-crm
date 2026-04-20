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
    return { id: user.id, name: user.name, email: user.email, role: user.role, passwordHash: user.password };
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return { id: user.id, name: user.name, email: user.email, role: user.role, passwordHash: user.password ?? "" };
  }

  async findAll(): Promise<UserRecord[]> {
    const users = await this.prisma.user.findMany({ orderBy: { name: "asc" } });
    return users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, passwordHash: u.password ?? "" }));
  }
}
