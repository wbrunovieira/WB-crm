import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { UniqueEntityID } from "@/core/unique-entity-id";
import {
  FunnelRepository,
  FunnelStats,
  WeeklyGoalRecord,
  WeeklyFunnelData,
  WeeklyFunnelActivity,
  WeeklyFunnelDeal,
} from "@/domain/funnel/application/repositories/funnel.repository";

@Injectable()
export class PrismaFunnelRepository extends FunnelRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getStats(ownerId?: string): Promise<FunnelStats> {
    // NOTE: this trusts the caller's resolved scope. Authorization (admin sees
    // all / specific, non-admin only own) MUST be resolved by the use case —
    // `undefined` here means "all owners". Do not call this adapter directly.
    const ownerFilter = ownerId ? { ownerId } : {};

    const [leadsTotal, callsTotal, connectionsTotal, meetingsTotal, dealsWon, dealsTotal] = await Promise.all([
      this.prisma.lead.count({ where: ownerFilter }),
      this.prisma.activity.count({ where: { ...ownerFilter, type: "call" } }),
      this.prisma.activity.count({ where: { ...ownerFilter, type: "call", completed: true } }),
      this.prisma.activity.count({ where: { ...ownerFilter, type: "meeting", completed: true } }),
      this.prisma.deal.count({ where: { ...ownerFilter, status: "won" } }),
      this.prisma.deal.count({ where: ownerFilter }),
    ]);

    return { leadsTotal, callsTotal, connectionsTotal, meetingsTotal, dealsWon, dealsTotal };
  }

  async findWeeklyGoals(ownerId: string): Promise<WeeklyGoalRecord[]> {
    const goals = await this.prisma.weeklyGoal.findMany({
      where: { ownerId },
      orderBy: { weekStart: "desc" },
    });
    return goals.map((g) => ({ id: g.id, weekStart: g.weekStart, targetSales: g.targetSales, ownerId: g.ownerId }));
  }

  async findWeeklyData(ownerId: string, weekStart: Date, weekEnd: Date): Promise<WeeklyFunnelData> {
    const [activities, wonDeals, goalRecord] = await Promise.all([
      this.prisma.activity.findMany({
        where: { ownerId, dueDate: { gte: weekStart, lt: weekEnd } },
        select: {
          type: true, gotoDuration: true, gotoCallOutcome: true, callContactType: true,
          completed: true, meetingNoShow: true, dueDate: true,
          leadId: true, contactId: true,
        },
      }),
      this.prisma.deal.findMany({
        where: { ownerId, status: "won", closedAt: { gte: weekStart, lt: weekEnd } },
        select: { status: true, closedAt: true },
      }),
      this.prisma.weeklyGoal.findUnique({
        where: { weekStart_ownerId: { weekStart, ownerId } },
      }),
    ]);

    return {
      activities: activities as WeeklyFunnelActivity[],
      wonDeals: wonDeals as WeeklyFunnelDeal[],
      targetSales: goalRecord?.targetSales ?? 6,
    };
  }

  async upsertWeeklyGoal(ownerId: string, weekStart: Date, targetSales: number): Promise<WeeklyGoalRecord> {
    const goal = await this.prisma.weeklyGoal.upsert({
      where: { weekStart_ownerId: { weekStart, ownerId } },
      create: {
        id: new UniqueEntityID().toString(),
        weekStart,
        targetSales,
        ownerId,
      },
      update: { targetSales },
    });
    return { id: goal.id, weekStart: goal.weekStart, targetSales: goal.targetSales, ownerId: goal.ownerId };
  }
}
