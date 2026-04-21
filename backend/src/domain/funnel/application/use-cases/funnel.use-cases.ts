import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { PrismaService } from "@/infra/database/prisma.service";
import { UniqueEntityID } from "@/core/unique-entity-id";

export interface FunnelStats {
  leadsTotal: number;
  callsTotal: number;
  connectionsTotal: number;
  meetingsTotal: number;
  dealsWon: number;
  dealsTotal: number;
}

export interface WeeklyGoalRecord {
  id: string;
  weekStart: Date;
  targetSales: number;
  ownerId: string;
}

export class WeeklyGoalNotFoundError extends Error { name = "WeeklyGoalNotFoundError"; }

export interface WeeklyFunnelActivity {
  type: string;
  gotoDuration: number | null;
  callContactType: string | null;
  completed: boolean;
  meetingNoShow: boolean;
  dueDate: Date | null;
  leadId: string | null;
  contactId: string | null;
}

export interface WeeklyFunnelDeal {
  status: string;
  closedAt: Date | null;
}

export interface WeeklyFunnelData {
  activities: WeeklyFunnelActivity[];
  wonDeals: WeeklyFunnelDeal[];
  targetSales: number;
}

@Injectable()
export class GetFunnelStatsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    ownerId?: string;
  }): Promise<Either<Error, FunnelStats>> {
    const ownerFilter = input.requesterRole === "admin"
      ? (input.ownerId ? { ownerId: input.ownerId } : {})
      : { ownerId: input.requesterId };

    const [leadsTotal, callsTotal, connectionsTotal, meetingsTotal, dealsWon, dealsTotal] = await Promise.all([
      this.prisma.lead.count({ where: ownerFilter }),
      this.prisma.activity.count({ where: { ...ownerFilter, type: "call" } }),
      this.prisma.activity.count({ where: { ...ownerFilter, type: "call", completed: true } }),
      this.prisma.activity.count({ where: { ...ownerFilter, type: "meeting", completed: true } }),
      this.prisma.deal.count({ where: { ...ownerFilter, status: "won" } }),
      this.prisma.deal.count({ where: ownerFilter }),
    ]);

    return right({ leadsTotal, callsTotal, connectionsTotal, meetingsTotal, dealsWon, dealsTotal });
  }
}

@Injectable()
export class GetWeeklyGoalsUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { requesterId: string }): Promise<Either<Error, WeeklyGoalRecord[]>> {
    const goals = await this.prisma.weeklyGoal.findMany({
      where: { ownerId: input.requesterId },
      orderBy: { weekStart: "desc" },
    });
    return right(goals.map(g => ({ id: g.id, weekStart: g.weekStart, targetSales: g.targetSales, ownerId: g.ownerId })));
  }
}

@Injectable()
export class GetWeeklyFunnelDataUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    requesterId: string;
    weekStart: Date;
    weekEnd: Date;
  }): Promise<Either<Error, WeeklyFunnelData>> {
    const [activities, wonDeals, goalRecord] = await Promise.all([
      this.prisma.activity.findMany({
        where: { ownerId: input.requesterId, dueDate: { gte: input.weekStart, lt: input.weekEnd } },
        select: {
          type: true, gotoDuration: true, callContactType: true,
          completed: true, meetingNoShow: true, dueDate: true,
          leadId: true, contactId: true,
        },
      }),
      this.prisma.deal.findMany({
        where: { ownerId: input.requesterId, status: "won", closedAt: { gte: input.weekStart, lt: input.weekEnd } },
        select: { status: true, closedAt: true },
      }),
      this.prisma.weeklyGoal.findUnique({
        where: { weekStart_ownerId: { weekStart: input.weekStart, ownerId: input.requesterId } },
      }),
    ]);

    return right({
      activities: activities as WeeklyFunnelActivity[],
      wonDeals: wonDeals as WeeklyFunnelDeal[],
      targetSales: goalRecord?.targetSales ?? 6,
    });
  }
}

@Injectable()
export class UpsertWeeklyGoalUseCase {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: {
    requesterId: string;
    weekStart: Date;
    targetSales: number;
  }): Promise<Either<Error, WeeklyGoalRecord>> {
    const goal = await this.prisma.weeklyGoal.upsert({
      where: { weekStart_ownerId: { weekStart: input.weekStart, ownerId: input.requesterId } },
      create: {
        id: new UniqueEntityID().toString(),
        weekStart: input.weekStart,
        targetSales: input.targetSales,
        ownerId: input.requesterId,
      },
      update: { targetSales: input.targetSales },
    });
    return right({ id: goal.id, weekStart: goal.weekStart, targetSales: goal.targetSales, ownerId: goal.ownerId });
  }
}
