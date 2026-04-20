import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { OperationsRepository, OperationsEntityType } from "../../application/repositories/operations.repository";

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
}
