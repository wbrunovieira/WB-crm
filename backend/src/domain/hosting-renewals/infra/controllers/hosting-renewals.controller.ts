import { Controller, Get, Post, Param, Query, Body, UseGuards, Request } from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { GetUpcomingRenewalsUseCase, CreateRenewalActivityUseCase } from "../../application/use-cases/hosting-renewals.use-cases";
import { UpcomingRenewal } from "../../application/repositories/hosting-renewals.repository";

function serializeRenewal(r: UpcomingRenewal) {
  return {
    organizationId: r.organizationId,
    organizationName: r.organizationName,
    hostingRenewalDate: r.hostingRenewalDate,
    ownerId: r.ownerId,
    daysUntilRenewal: r.daysUntilRenewal,
    hostingPlan: r.hostingPlan,
    hostingValue: r.hostingValue,
  };
}

@UseGuards(JwtAuthGuard)
@Controller("hosting-renewals")
export class HostingRenewalsController {
  constructor(
    private readonly getUpcoming: GetUpcomingRenewalsUseCase,
    private readonly createActivity: CreateRenewalActivityUseCase,
  ) {}

  @Get()
  async listUpcoming(@Request() req: any, @Query("daysAhead") daysAhead?: string) {
    const result = await this.getUpcoming.execute({
      requesterId: req.user.id,
      daysAhead: daysAhead ? Number(daysAhead) : undefined,
    });
    if (result.isLeft()) throw result.value;
    return result.unwrap().map(serializeRenewal);
  }

  @Post(":organizationId/activity")
  async createRenewalActivity(
    @Request() req: any,
    @Param("organizationId") organizationId: string,
    @Body() body: { dueDate?: string; subject?: string },
  ) {
    const result = await this.createActivity.execute({
      organizationId,
      requesterId: req.user.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      subject: body.subject,
    });
    if (result.isLeft()) throw result.value;
    return result.unwrap();
  }
}
