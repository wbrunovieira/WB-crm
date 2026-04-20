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
