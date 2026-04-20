import { Controller, Get, Post, Body, Query, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import {
  GetFunnelStatsUseCase,
  GetWeeklyGoalsUseCase,
  UpsertWeeklyGoalUseCase,
} from "../../application/use-cases/funnel.use-cases";

@UseGuards(JwtAuthGuard)
@Controller("funnel")
export class FunnelController {
  constructor(
    private readonly getStats: GetFunnelStatsUseCase,
    private readonly getGoals: GetWeeklyGoalsUseCase,
    private readonly upsertGoal: UpsertWeeklyGoalUseCase,
  ) {}

  @Get("stats")
  async stats(@Request() req: any, @Query("ownerId") ownerId?: string) {
    const result = await this.getStats.execute({
      requesterId: req.user.id,
      requesterRole: req.user.role,
      ownerId,
    });
    if (result.isLeft()) throw result.value;
    return result.unwrap();
  }

  @Get("goals")
  async goals(@Request() req: any) {
    const result = await this.getGoals.execute({ requesterId: req.user.id });
    if (result.isLeft()) throw result.value;
    return result.unwrap();
  }

  @Post("goals")
  async upsert(@Request() req: any, @Body() body: { weekStart: string; targetSales: number }) {
    const result = await this.upsertGoal.execute({
      requesterId: req.user.id,
      weekStart: new Date(body.weekStart),
      targetSales: body.targetSales,
    });
    if (result.isLeft()) throw result.value;
    return result.unwrap();
  }
}
