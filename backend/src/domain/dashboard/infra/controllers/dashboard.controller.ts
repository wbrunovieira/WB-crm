import { Controller, Get, Query, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import {
  GetManagerStatsUseCase,
  GetTimelineDataUseCase,
  GetActivityCalendarUseCase,
} from "../../application/use-cases/dashboard.use-cases";

@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(
    private readonly getStats: GetManagerStatsUseCase,
    private readonly getTimeline: GetTimelineDataUseCase,
    private readonly getCalendar: GetActivityCalendarUseCase,
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

  @Get("timeline")
  async timeline(@Request() req: any, @Query("days") days?: string) {
    const result = await this.getTimeline.execute({
      requesterId: req.user.id,
      requesterRole: req.user.role,
      days: days ? Number(days) : undefined,
    });
    if (result.isLeft()) throw result.value;
    return result.unwrap();
  }

  @Get("activity-calendar")
  async activityCalendar(
    @Request() req: any,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    const result = await this.getCalendar.execute({
      requesterId: req.user.id,
      requesterRole: req.user.role,
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
    if (result.isLeft()) throw result.value;
    return result.unwrap();
  }
}
