import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  DashboardRepository,
  DashboardStatsInput,
  DashboardStatsRawData,
  TimelineStatsInput,
  TimelineRawData,
  ActivityCalendarInput,
  ActivityCalendarRawData,
} from "@/domain/dashboard/application/repositories/dashboard.repository";

@Injectable()
export class PrismaDashboardRepository extends DashboardRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async fetchStatsData(input: DashboardStatsInput): Promise<DashboardStatsRawData> {
    const { startDate, endDate, ownerFilter, prevStartDate, prevEndDate } = input;
    const dateFilter = { createdAt: { gte: startDate, lte: endDate } };

    const [users, leads, organizations, deals, contacts, partners, activities, stageChanges, stages] =
      await Promise.all([
        this.prisma.user.findMany({ select: { id: true, name: true, email: true } }),
        this.prisma.lead.findMany({
          where: { ...ownerFilter, ...dateFilter },
          select: { ownerId: true, convertedAt: true },
        }),
        this.prisma.organization.findMany({
          where: { ...ownerFilter, ...dateFilter },
          select: { ownerId: true },
        }),
        this.prisma.deal.findMany({
          where: { ...ownerFilter, ...dateFilter },
          select: {
            ownerId: true, status: true, value: true, stageId: true,
            stage: { select: { name: true } },
          },
        }),
        this.prisma.contact.findMany({
          where: { ...ownerFilter, ...dateFilter },
          select: { ownerId: true },
        }),
        this.prisma.partner.findMany({
          where: { ...ownerFilter, ...dateFilter },
          select: { ownerId: true, partnerType: true },
        }),
        this.prisma.activity.findMany({
          where: { ...ownerFilter, ...dateFilter },
          select: { ownerId: true, type: true, completed: true, dueDate: true },
        }),
        this.prisma.dealStageHistory.findMany({
          where: { changedAt: { gte: startDate, lte: endDate } },
          select: {
            changedById: true,
            fromStage: { select: { name: true } },
            toStage: { select: { name: true } },
          },
        }),
        this.prisma.stage.findMany({ select: { id: true, name: true } }),
      ]);

    const prevDateFilter = { createdAt: { gte: prevStartDate, lte: prevEndDate } };
    const prevOwnerFilter = ownerFilter;

    const [prevLeads, prevOrgs, prevDealsAgg, prevContacts, prevPartners, prevActivities] =
      await Promise.all([
        this.prisma.lead.count({ where: { ...prevOwnerFilter, ...prevDateFilter } }),
        this.prisma.organization.count({ where: { ...prevOwnerFilter, ...prevDateFilter } }),
        this.prisma.deal.aggregate({
          where: { ...prevOwnerFilter, ...prevDateFilter },
          _count: true,
          _sum: { value: true },
        }),
        this.prisma.contact.count({ where: { ...prevOwnerFilter, ...prevDateFilter } }),
        this.prisma.partner.count({ where: { ...prevOwnerFilter, ...prevDateFilter } }),
        this.prisma.activity.count({ where: { ...prevOwnerFilter, ...prevDateFilter } }),
      ]);

    return {
      users,
      leads,
      organizations,
      deals: deals.map(d => ({
        ownerId: d.ownerId,
        status: d.status,
        value: d.value,
        stageId: d.stageId,
        stageName: d.stage?.name ?? null,
      })),
      contacts,
      partners,
      activities,
      stageChanges: stageChanges.map(sc => ({
        changedById: sc.changedById,
        fromStageName: sc.fromStage?.name ?? null,
        toStageName: sc.toStage.name,
      })),
      stages,
      prevCounts: {
        leads: prevLeads,
        organizations: prevOrgs,
        dealsCount: prevDealsAgg._count,
        dealsValue: prevDealsAgg._sum.value ?? 0,
        contacts: prevContacts,
        partners: prevPartners,
        activities: prevActivities,
      },
    };
  }

  async fetchTimelineData(input: TimelineStatsInput): Promise<TimelineRawData> {
    const { startDate, endDate, ownerFilter } = input;
    const dateFilter = { createdAt: { gte: startDate, lte: endDate } };

    const [leads, deals] = await Promise.all([
      this.prisma.lead.findMany({
        where: { ...ownerFilter, ...dateFilter },
        select: { createdAt: true, convertedAt: true },
      }),
      this.prisma.deal.findMany({
        where: { ...ownerFilter, ...dateFilter },
        select: { createdAt: true, value: true },
      }),
    ]);

    return { leads, deals };
  }

  async fetchActivityCalendarData(input: ActivityCalendarInput): Promise<ActivityCalendarRawData> {
    const { startDate, endDate, ownerFilter } = input;

    const activities = await this.prisma.activity.findMany({
      where: {
        ...ownerFilter,
        OR: [
          { completedAt: { gte: startDate, lte: endDate } },
          { failedAt: { gte: startDate, lte: endDate } },
          { skippedAt: { gte: startDate, lte: endDate } },
          { completed: true, completedAt: null, dueDate: { gte: startDate, lte: endDate } },
          { completed: true, completedAt: null, dueDate: null, createdAt: { gte: startDate, lte: endDate } },
          { dueDate: { gte: startDate, lte: endDate }, completed: false, failedAt: null, skippedAt: null },
          { dueDate: null, createdAt: { gte: startDate, lte: endDate }, completed: false, failedAt: null, skippedAt: null },
        ],
      },
      select: { type: true, completed: true, completedAt: true, failedAt: true, skippedAt: true, dueDate: true, createdAt: true },
    });

    return { activities };
  }
}
