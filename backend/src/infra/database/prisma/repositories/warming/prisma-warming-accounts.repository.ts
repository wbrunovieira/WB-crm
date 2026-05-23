import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { WarmingAccountsRepository } from "@/domain/warming/application/repositories/warming-accounts.repository";
import { WarmingAccount, WarmingPhase } from "@/domain/warming/enterprise/entities/warming-account.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaWarmingAccountsRepository implements WarmingAccountsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toDomain(raw: {
    id: string; email: string; isActive: boolean; phase: string;
    startedAt: Date; ownerId: string; createdAt: Date; updatedAt: Date;
  }): WarmingAccount {
    return WarmingAccount.reconstitute(
      {
        email: raw.email,
        isActive: raw.isActive,
        phase: raw.phase as WarmingPhase,
        startedAt: raw.startedAt,
        ownerId: raw.ownerId,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  async findById(id: string): Promise<WarmingAccount | null> {
    const raw = await this.prisma.warmingAccount.findUnique({ where: { id } });
    return raw ? this.toDomain(raw) : null;
  }

  async findByEmail(email: string): Promise<WarmingAccount | null> {
    const raw = await this.prisma.warmingAccount.findUnique({ where: { email } });
    return raw ? this.toDomain(raw) : null;
  }

  async findAllActive(ownerId: string): Promise<WarmingAccount[]> {
    const rows = await this.prisma.warmingAccount.findMany({
      where: { ownerId, isActive: true },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async findAll(ownerId: string): Promise<WarmingAccount[]> {
    const rows = await this.prisma.warmingAccount.findMany({ where: { ownerId } });
    return rows.map((r) => this.toDomain(r));
  }

  async save(account: WarmingAccount): Promise<void> {
    await this.prisma.warmingAccount.upsert({
      where: { id: account.id.toString() },
      create: {
        id: account.id.toString(),
        email: account.email,
        isActive: account.isActive,
        phase: account.phase,
        startedAt: account.startedAt,
        ownerId: account.ownerId,
      },
      update: {
        isActive: account.isActive,
        phase: account.phase,
        updatedAt: account.updatedAt,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.warmingAccount.delete({ where: { id } });
  }
}
