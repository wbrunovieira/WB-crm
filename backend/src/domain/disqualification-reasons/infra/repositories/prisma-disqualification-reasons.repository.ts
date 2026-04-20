import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { DisqualificationReasonsRepository } from "../../application/repositories/disqualification-reasons.repository";
import { DisqualificationReason } from "../../enterprise/entities/disqualification-reason";
import { UniqueEntityID } from "@/core/unique-entity-id";

function map(raw: Record<string, unknown>): DisqualificationReason {
  return DisqualificationReason.create(
    { name: raw.name as string, ownerId: raw.ownerId as string, createdAt: raw.createdAt as Date },
    new UniqueEntityID(raw.id as string),
  ).unwrap() as DisqualificationReason;
}

@Injectable()
export class PrismaDisqualificationReasonsRepository extends DisqualificationReasonsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findByOwner(ownerId: string): Promise<DisqualificationReason[]> {
    const rows = await this.prisma.disqualificationReason.findMany({ where: { ownerId }, orderBy: { name: "asc" } });
    return rows.map(r => map(r as unknown as Record<string, unknown>));
  }

  async findById(id: string): Promise<DisqualificationReason | null> {
    const raw = await this.prisma.disqualificationReason.findUnique({ where: { id } });
    if (!raw) return null;
    return map(raw as unknown as Record<string, unknown>);
  }

  async existsByNameAndOwner(name: string, ownerId: string): Promise<boolean> {
    const row = await this.prisma.disqualificationReason.findFirst({ where: { name, ownerId } });
    return !!row;
  }

  async save(reason: DisqualificationReason): Promise<void> {
    await this.prisma.disqualificationReason.upsert({
      where: { id: reason.id.toString() },
      create: { id: reason.id.toString(), name: reason.name, ownerId: reason.ownerId },
      update: { name: reason.name },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.disqualificationReason.delete({ where: { id } });
  }
}
