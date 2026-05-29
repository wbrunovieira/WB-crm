import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import {
  FunnelRepository,
  FunnelStats,
  WeeklyGoalRecord,
  WeeklyFunnelData,
} from "../repositories/funnel.repository";

export type { FunnelStats, WeeklyGoalRecord, WeeklyFunnelData, WeeklyFunnelActivity, WeeklyFunnelDeal } from "../repositories/funnel.repository";

export class WeeklyGoalNotFoundError extends Error { name = "WeeklyGoalNotFoundError"; }

@Injectable()
export class GetFunnelStatsUseCase {
  constructor(private readonly funnel: FunnelRepository) {}

  async execute(input: {
    requesterId: string;
    requesterRole: string;
    ownerId?: string;
  }): Promise<Either<Error, FunnelStats>> {
    // Scope resolution (authorization) is the use case's job; the repo just counts.
    const targetOwnerId =
      input.requesterRole === "admin" ? input.ownerId : input.requesterId;

    const stats = await this.funnel.getStats(targetOwnerId);
    return right(stats);
  }
}

@Injectable()
export class GetWeeklyGoalsUseCase {
  constructor(private readonly funnel: FunnelRepository) {}

  async execute(input: { requesterId: string }): Promise<Either<Error, WeeklyGoalRecord[]>> {
    const goals = await this.funnel.findWeeklyGoals(input.requesterId);
    return right(goals);
  }
}

@Injectable()
export class GetWeeklyFunnelDataUseCase {
  constructor(private readonly funnel: FunnelRepository) {}

  async execute(input: {
    requesterId: string;
    weekStart: Date;
    weekEnd: Date;
  }): Promise<Either<Error, WeeklyFunnelData>> {
    const data = await this.funnel.findWeeklyData(input.requesterId, input.weekStart, input.weekEnd);
    return right(data);
  }
}

@Injectable()
export class UpsertWeeklyGoalUseCase {
  constructor(private readonly funnel: FunnelRepository) {}

  async execute(input: {
    requesterId: string;
    weekStart: Date;
    targetSales: number;
  }): Promise<Either<Error, WeeklyGoalRecord>> {
    const goal = await this.funnel.upsertWeeklyGoal(input.requesterId, input.weekStart, input.targetSales);
    return right(goal);
  }
}
