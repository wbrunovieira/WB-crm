import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { WarmingPoolEmailsRepository } from "@/domain/warming/application/repositories/warming-pool-emails.repository";
import { WarmingPoolEmail } from "@/domain/warming/enterprise/entities/warming-pool-email.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaWarmingPoolEmailsRepository implements WarmingPoolEmailsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: {
    id: string; email: string; name: string | null; isActive: boolean;
    ownerId: string; createdAt: Date;
  }): WarmingPoolEmail {
    return WarmingPoolEmail.reconstitute(
      { email: raw.email, name: raw.name, isActive: raw.isActive, ownerId: raw.ownerId, createdAt: raw.createdAt },
      new UniqueEntityID(raw.id),
    );
  }

  async findById(id: string): Promise<WarmingPoolEmail | null> {
    const raw = await this.prisma.warmingPoolEmail.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findAll(ownerId: string): Promise<WarmingPoolEmail[]> {
    const rows = await this.prisma.warmingPoolEmail.findMany({ where: { ownerId } });
    return rows.map((r) => this.toDomain(r));
  }

  async findAllActive(ownerId: string): Promise<WarmingPoolEmail[]> {
    const rows = await this.prisma.warmingPoolEmail.findMany({ where: { ownerId, isActive: true } });
    return rows.map((r) => this.toDomain(r));
  }

  async findByEmail(email: string, ownerId: string): Promise<WarmingPoolEmail | null> {
    const raw = await this.prisma.warmingPoolEmail.findUnique({
      where: { email_ownerId: { email, ownerId } },
    });
    return raw ? this.toDomain(raw) : null;
  }

  async save(poolEmail: WarmingPoolEmail): Promise<void> {
    await this.prisma.warmingPoolEmail.upsert({
      where: { id: poolEmail.id.toString() },
      create: {
        id: poolEmail.id.toString(),
        email: poolEmail.email,
        name: poolEmail.name,
        isActive: poolEmail.isActive,
        ownerId: poolEmail.ownerId,
      },
      update: {
        name: poolEmail.name,
        isActive: poolEmail.isActive,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.warmingPoolEmail.delete({ where: { id } });
  }
}
