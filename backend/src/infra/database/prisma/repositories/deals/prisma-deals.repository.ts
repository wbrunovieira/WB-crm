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
    const ownerFilter = requesterRole === "admin" && filters.owner === "all"
      ? {}
      : requesterRole === "admin" && filters.owner && filters.owner !== "mine"
        ? { ownerId: filters.owner }
        : { ownerId: requesterId };

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
        _count: { select: { activities: true, dealProducts: true } },
      },
      orderBy: [{ updatedAt: "desc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      title: row.title,
      description: row.description,
      value: row.value,
      currency: row.currency,
      status: row.status,
      closedAt: row.closedAt,
      stageId: row.stageId,
      contactId: row.contactId,
      organizationId: row.organizationId,
      expectedCloseDate: row.expectedCloseDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: row.owner,
      stage: row.stage,
      contact: row.contact,
      organization: row.organization,
      _count: row._count,
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<DealDetail | null> {
    const ownerFilter = requesterRole === "admin" ? {} : { ownerId: requesterId };

    const row = await this.prisma.deal.findFirst({
      where: { id, ...ownerFilter },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        stage: { select: { id: true, name: true, probability: true } },
        contact: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
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
      expectedCloseDate: r.expectedCloseDate,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      owner: r.owner,
      stage: r.stage,
      contact: r.contact,
      organization: r.organization,
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
}
