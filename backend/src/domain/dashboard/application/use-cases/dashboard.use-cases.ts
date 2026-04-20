import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { PrismaService } from "@/infra/database/prisma.service";

export interface UserStats {
  userId: string;
  userName: string;
  leadsCreated: number;
  leadsConverted: number;
  activitiesByType: Record<string, number>;
  dealsByStatus: Record<string, number>;
  totalDealsValue: number;
}

export interface TimelinePoint {
  date: string;
  leads: number;
  deals: number;
}

export interface CalendarPoint {
  date: string;
  count: number;
}

@Injectable()
export class GetManagerStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    ownerId?: string;
  }): Promise<Either<Error, UserStats[]>> {
    const ownerFilter = input.requesterRole === "admin"
      ? (input.ownerId ? { ownerId: input.ownerId } : {})
      : { ownerId: input.requesterId };

    const [users, leads, activities, deals] = await Promise.all([
      this.prisma.user.findMany({ select: { id: true, name: true } }),
      this.prisma.lead.findMany({ where: ownerFilter, select: { ownerId: true, convertedToOrganizationId: true } }),
      this.prisma.activity.findMany({ where: ownerFilter, select: { ownerId: true, type: true } }),
      this.prisma.deal.findMany({ where: ownerFilter, select: { ownerId: true, status: true, value: true, currency: true } }),
    ]);

    const userMap = new Map(users.map(u => [u.id, u.name]));
    const ownerIds = input.requesterRole === "admin" && !input.ownerId
      ? [...new Set([...leads.map(l => l.ownerId), ...activities.map(a => a.ownerId), ...deals.map(d => d.ownerId)])]
      : [input.requesterId];

    const stats: UserStats[] = ownerIds.map(uid => {
      const userLeads = leads.filter(l => l.ownerId === uid);
      const userActivities = activities.filter(a => a.ownerId === uid);
      const userDeals = deals.filter(d => d.ownerId === uid);

      const activitiesByType: Record<string, number> = {};
      userActivities.forEach(a => { activitiesByType[a.type] = (activitiesByType[a.type] ?? 0) + 1; });

      const dealsByStatus: Record<string, number> = {};
      let totalDealsValue = 0;
      userDeals.forEach(d => {
        dealsByStatus[d.status ?? "unknown"] = (dealsByStatus[d.status ?? "unknown"] ?? 0) + 1;
        totalDealsValue += d.value ?? 0;
      });

      return {
        userId: uid,
        userName: userMap.get(uid) ?? uid,
        leadsCreated: userLeads.length,
        leadsConverted: userLeads.filter(l => l.convertedToOrganizationId).length,
        activitiesByType,
        dealsByStatus,
        totalDealsValue,
      };
    });

    return right(stats);
  }
}

@Injectable()
export class GetTimelineDataUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    days?: number;
  }): Promise<Either<Error, TimelinePoint[]>> {
    const days = input.days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const ownerFilter = input.requesterRole === "admin" ? {} : { ownerId: input.requesterId };

    const [leads, deals] = await Promise.all([
      this.prisma.lead.findMany({ where: { ...ownerFilter, createdAt: { gte: since } }, select: { createdAt: true } }),
      this.prisma.deal.findMany({ where: { ...ownerFilter, createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);

    const byDate: Record<string, { leads: number; deals: number }> = {};
    const addDay = (date: Date, key: "leads" | "deals") => {
      const d = date.toISOString().split("T")[0];
      if (!byDate[d]) byDate[d] = { leads: 0, deals: 0 };
      byDate[d][key]++;
    };
    leads.forEach(l => addDay(l.createdAt, "leads"));
    deals.forEach(d => addDay(d.createdAt, "deals"));

    const timeline: TimelinePoint[] = Object.entries(byDate)
      .map(([date, v]) => ({ date, leads: v.leads, deals: v.deals }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return right(timeline);
  }
}

@Injectable()
export class GetActivityCalendarUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    year?: number;
    month?: number;
  }): Promise<Either<Error, CalendarPoint[]>> {
    const now = new Date();
    const year = input.year ?? now.getFullYear();
    const month = input.month ?? now.getMonth() + 1;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);

    const ownerFilter = input.requesterRole === "admin" ? {} : { ownerId: input.requesterId };

    const activities = await this.prisma.activity.findMany({
      where: { ...ownerFilter, createdAt: { gte: start, lt: end } },
      select: { createdAt: true },
    });

    const byDate: Record<string, number> = {};
    activities.forEach(a => {
      const d = a.createdAt.toISOString().split("T")[0];
      byDate[d] = (byDate[d] ?? 0) + 1;
    });

    const calendar: CalendarPoint[] = Object.entries(byDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return right(calendar);
  }
}
