import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  DealsRepository,
  type DealFilters,
  type StageData,
  type CreateStageHistoryInput,
} from "@/domain/deals/application/repositories/deals.repository";
import type { Deal } from "@/domain/deals/enterprise/entities/deal";
import type { DealSummary, DealDetail } from "@/domain/deals/enterprise/read-models/deal-read-models";
import { DealMapper } from "../../mappers/deals/deal.mapper";

@Injectable()
export class PrismaDealsRepository extends DealsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany(requesterId: string, requesterRole: string, filters: DealFilters = {}): Promise<DealSummary[]> {
    let ownerFilter: Record<string, unknown>;
    if (requesterRole === "admin") {
      ownerFilter = !filters.owner || filters.owner === "all"
        ? {}
        : filters.owner === "mine" ? { ownerId: requesterId } : { ownerId: filters.owner };
    } else {
      const shared = await this.prisma.sharedEntity.findMany({
        where: { entityType: "deal", sharedWithUserId: requesterId },
        select: { entityId: true },
      });
      const sharedIds = shared.map((s) => s.entityId);
      ownerFilter = sharedIds.length > 0
        ? { OR: [{ ownerId: requesterId }, { id: { in: sharedIds } }] }
        : { ownerId: requesterId };
    }

    const rows = await this.prisma.deal.findMany({
      where: {
        ...ownerFilter,
        ...(filters.stageId && { stageId: filters.stageId }),
        ...(filters.status && { status: filters.status }),
        ...(filters.organizationId && { organizationId: filters.organizationId }),
        ...(filters.contactId && { contactId: filters.contactId }),
        ...(filters.search && {
          OR: [
            { title: { contains: filters.search, mode: "insensitive" } },
            { description: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        stage: { select: { id: true, name: true, probability: true } },
        contact: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        lead: { select: { id: true, businessName: true } },
        _count: { select: { activities: true, dealProducts: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    return rows.map((row) => {
      const r = row as any;
      return {
        id: r.id,
        ownerId: r.ownerId,
        title: r.title,
        description: r.description,
        value: r.value,
        currency: r.currency,
        status: r.status,
        closedAt: r.closedAt,
        stageId: r.stageId,
        contactId: r.contactId,
        organizationId: r.organizationId,
        leadId: r.leadId,
        expectedCloseDate: r.expectedCloseDate,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        owner: r.owner,
        stage: r.stage,
        contact: r.contact,
        organization: r.organization,
        lead: r.lead,
        _count: r._count,
      };
    });
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<DealDetail | null> {
    const row = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        stage: { select: { id: true, name: true, probability: true } },
        contact: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        lead: { select: { id: true, businessName: true } },
        _count: { select: { activities: true, dealProducts: true } },
        activities: {
          select: { id: true, type: true, subject: true, completed: true, dueDate: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        dealProducts: {
          select: {
            id: true,
            productId: true,
            product: { select: { id: true, name: true } },
            quantity: true,
            unitPrice: true,
            discount: true,
            description: true,
          },
        },
        stageHistory: {
          select: {
            id: true,
            fromStageId: true,
            toStageId: true,
            changedById: true,
            changedAt: true,
            fromStage: { select: { id: true, name: true } },
            toStage: { select: { id: true, name: true } },
          },
          orderBy: { changedAt: "desc" },
        },
      },
    });

    if (!row) return null;

    // Access check for non-admin
    if (requesterRole !== "admin" && row.ownerId !== requesterId) {
      const shared = await this.prisma.sharedEntity.findFirst({
        where: { entityType: "deal", entityId: id, sharedWithUserId: requesterId },
      });
      if (!shared) return null;
    }

    const r = row as any;
    return {
      id: r.id,
      ownerId: r.ownerId,
      title: r.title,
      description: r.description,
      value: r.value,
      currency: r.currency,
      status: r.status,
      closedAt: r.closedAt,
      stageId: r.stageId,
      contactId: r.contactId,
      organizationId: r.organizationId,
      leadId: r.leadId,
      expectedCloseDate: r.expectedCloseDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      owner: r.owner,
      stage: r.stage,
      contact: r.contact,
      organization: r.organization,
      lead: r.lead,
      _count: r._count,
      activities: r.activities,
      dealProducts: r.dealProducts,
      stageHistory: r.stageHistory,
    };
  }

  async findByIdRaw(id: string): Promise<Deal | null> {
    const row = await this.prisma.deal.findUnique({ where: { id } });
    if (!row) return null;
    return DealMapper.toDomain(row);
  }

  async findStageById(id: string): Promise<StageData | null> {
    const stage = await this.prisma.stage.findUnique({
      where: { id },
      select: { id: true, name: true, probability: true },
    });
    return stage ?? null;
  }

  async save(deal: Deal): Promise<void> {
    const data = DealMapper.toPrisma(deal);
    await this.prisma.deal.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.deal.delete({ where: { id } });
  }

  async createStageHistory(input: CreateStageHistoryInput): Promise<void> {
    await this.prisma.dealStageHistory.create({
      data: {
        dealId: input.dealId,
        fromStageId: input.fromStageId,
        toStageId: input.toStageId,
        changedById: input.changedById,
      },
    });
  }

  async updateStageHistoryDate(historyId: string, changedAt: Date): Promise<{ dealId: string } | null> {
    const existing = await this.prisma.dealStageHistory.findUnique({ where: { id: historyId }, select: { dealId: true } });
    if (!existing) return null;
    await this.prisma.dealStageHistory.update({ where: { id: historyId }, data: { changedAt } });
    return { dealId: existing.dealId };
  }
}
