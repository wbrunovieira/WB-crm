import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { BulkResearchSessionRepository, type BulkResearchSessionData } from "../application/repositories/bulk-research-session.repository";

function parse(row: { id: string; userId: string; leadIds: string; completedIds: string; total: number; status: string; createdAt: Date; updatedAt: Date }): BulkResearchSessionData {
  return {
    ...row,
    leadIds: JSON.parse(row.leadIds) as string[],
    completedIds: JSON.parse(row.completedIds) as string[],
  };
}

@Injectable()
export class PrismaBulkResearchSessionRepository extends BulkResearchSessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(data: { userId: string; leadIds: string[]; total: number }): Promise<BulkResearchSessionData> {
    const row = await this.prisma.bulkResearchSession.create({
      data: {
        userId: data.userId,
        leadIds: JSON.stringify(data.leadIds),
        total: data.total,
      },
    });
    return parse(row);
  }

  async findActiveByUserId(userId: string): Promise<BulkResearchSessionData | null> {
    const row = await this.prisma.bulkResearchSession.findFirst({
      where: { userId, status: "running" },
      orderBy: { createdAt: "desc" },
    });
    return row ? parse(row) : null;
  }

  async findActiveContainingLead(leadId: string): Promise<BulkResearchSessionData | null> {
    const rows = await this.prisma.bulkResearchSession.findMany({
      where: { status: "running" },
    });
    const match = rows.find((r) => {
      const ids = JSON.parse(r.leadIds) as string[];
      return ids.includes(leadId);
    });
    return match ? parse(match) : null;
  }

  async markLeadCompleted(sessionId: string, leadId: string): Promise<BulkResearchSessionData> {
    const row = await this.prisma.bulkResearchSession.findUniqueOrThrow({ where: { id: sessionId } });
    const completedIds = JSON.parse(row.completedIds) as string[];
    if (!completedIds.includes(leadId)) completedIds.push(leadId);
    const updated = await this.prisma.bulkResearchSession.update({
      where: { id: sessionId },
      data: { completedIds: JSON.stringify(completedIds) },
    });
    return parse(updated);
  }

  async markCompleted(sessionId: string): Promise<void> {
    await this.prisma.bulkResearchSession.update({
      where: { id: sessionId },
      data: { status: "completed" },
    });
  }

  async cancel(sessionId: string): Promise<void> {
    await this.prisma.bulkResearchSession.update({
      where: { id: sessionId },
      data: { status: "cancelled" },
    });
  }

  async cancelAllActiveForUser(userId: string): Promise<void> {
    await this.prisma.bulkResearchSession.updateMany({
      where: { userId, status: "running" },
      data: { status: "cancelled" },
    });
  }
}
