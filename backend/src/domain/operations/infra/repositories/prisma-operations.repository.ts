import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { OperationsRepository, OperationsEntityType, OperationsSearchResult } from "../../application/repositories/operations.repository";

@Injectable()
export class PrismaOperationsRepository extends OperationsRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findById(entityType: OperationsEntityType, entityId: string): Promise<{ id: string; ownerId: string; inOperationsAt: Date | null } | null> {
    if (entityType === "lead") {
      const r = await this.prisma.lead.findUnique({ where: { id: entityId }, select: { id: true, ownerId: true, inOperationsAt: true } });
      return r ?? null;
    }
    const r = await this.prisma.organization.findUnique({ where: { id: entityId }, select: { id: true, ownerId: true, inOperationsAt: true } });
    return r ?? null;
  }

  async transferToOperations(entityType: OperationsEntityType, entityId: string, transferredAt: Date): Promise<void> {
    if (entityType === "lead") {
      await this.prisma.lead.update({ where: { id: entityId }, data: { inOperationsAt: transferredAt } });
    } else {
      await this.prisma.organization.update({ where: { id: entityId }, data: { inOperationsAt: transferredAt } });
    }
  }

  async revertFromOperations(entityType: OperationsEntityType, entityId: string): Promise<void> {
    if (entityType === "lead") {
      await this.prisma.lead.update({ where: { id: entityId }, data: { inOperationsAt: null } });
    } else {
      await this.prisma.organization.update({ where: { id: entityId }, data: { inOperationsAt: null } });
    }
  }

  async search(query: string): Promise<OperationsSearchResult[]> {
    const [leads, orgs] = await Promise.all([
      this.prisma.lead.findMany({
        where: { businessName: { contains: query, mode: "insensitive" } },
        select: { id: true, businessName: true, inOperationsAt: true },
        take: 20,
        orderBy: { businessName: "asc" },
      }),
      this.prisma.organization.findMany({
        where: { name: { contains: query, mode: "insensitive" } },
        select: { id: true, name: true, inOperationsAt: true },
        take: 20,
        orderBy: { name: "asc" },
      }),
    ]);

    return [
      ...leads.map((l) => ({ id: l.id, name: l.businessName, type: "lead" as const, inOperationsAt: l.inOperationsAt })),
      ...orgs.map((o) => ({ id: o.id, name: o.name, type: "organization" as const, inOperationsAt: o.inOperationsAt })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }
}
