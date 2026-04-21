import { Controller, Get, Post, Body, Query, UseGuards, Request, BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import {
  GetFunnelStatsUseCase,
  GetWeeklyGoalsUseCase,
  UpsertWeeklyGoalUseCase,
  GetWeeklyFunnelDataUseCase,
} from "../../application/use-cases/funnel.use-cases";

@UseGuards(JwtAuthGuard)
@Controller("funnel")
export class FunnelController {
  constructor(
    private readonly getStats: GetFunnelStatsUseCase,
    private readonly getGoals: GetWeeklyGoalsUseCase,
    private readonly upsertGoal: UpsertWeeklyGoalUseCase,
    private readonly getWeeklyData: GetWeeklyFunnelDataUseCase,
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

  @Get("weekly-stats")
  async weeklyStats(@Request() req: any, @Query("weekStart") weekStartStr: string) {
    if (!weekStartStr) throw new BadRequestException("weekStart query param required (YYYY-MM-DD)");
    const weekStart = new Date(weekStartStr);
    if (isNaN(weekStart.getTime())) throw new BadRequestException("Invalid weekStart date");
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    const result = await this.getWeeklyData.execute({ requesterId: req.user.id, weekStart, weekEnd });
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
