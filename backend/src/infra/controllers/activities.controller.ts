import {
  Body, Controller, Delete, Get, HttpCode, NotFoundException,
  Param, Patch, Post, Query, UnauthorizedException, UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery,
  ApiResponse, ApiTags, ApiProperty, ApiPropertyOptional,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { Left } from "@/core/either";
import { GetActivitiesUseCase } from "@/domain/activities/application/use-cases/get-activities.use-case";
import { GetActivityByIdUseCase } from "@/domain/activities/application/use-cases/get-activity-by-id.use-case";
import { CreateActivityUseCase } from "@/domain/activities/application/use-cases/create-activity.use-case";
import { UpdateActivityUseCase } from "@/domain/activities/application/use-cases/update-activity.use-case";
import { DeleteActivityUseCase } from "@/domain/activities/application/use-cases/delete-activity.use-case";
import { ToggleActivityCompletedUseCase } from "@/domain/activities/application/use-cases/toggle-activity-completed.use-case";
import { MarkActivityFailedUseCase } from "@/domain/activities/application/use-cases/mark-activity-failed.use-case";
import { MarkActivitySkippedUseCase } from "@/domain/activities/application/use-cases/mark-activity-skipped.use-case";
import { RevertActivityOutcomeUseCase } from "@/domain/activities/application/use-cases/revert-activity-outcome.use-case";
import { LinkActivityToDealUseCase } from "@/domain/activities/application/use-cases/link-activity-to-deal.use-case";
import { UnlinkActivityFromDealUseCase } from "@/domain/activities/application/use-cases/unlink-activity-from-deal.use-case";
import type { Activity } from "@/domain/activities/enterprise/entities/activity";

/* ─── DTOs ─────────────────────────────────────────────────────────────────── */

class CreateActivityDto {
  @ApiProperty({ example: "call" }) type!: string;
  @ApiProperty({ example: "Ligação com João" }) subject!: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() dueDate?: string;
  @ApiPropertyOptional() dealId?: string;
  @ApiPropertyOptional({ type: [String] }) contactIds?: string[];
  @ApiPropertyOptional({ type: [String] }) leadContactIds?: string[];
  @ApiPropertyOptional() leadId?: string;
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() partnerId?: string;
  @ApiPropertyOptional({ enum: ["gatekeeper", "decisor"] }) callContactType?: string;
  @ApiPropertyOptional() meetingNoShow?: boolean;
}

class UpdateActivityDto {
  @ApiPropertyOptional() type?: string;
  @ApiPropertyOptional() subject?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() dueDate?: string;
  @ApiPropertyOptional() dealId?: string;
  @ApiPropertyOptional({ type: [String] }) contactIds?: string[];
  @ApiPropertyOptional({ type: [String] }) leadContactIds?: string[];
  @ApiPropertyOptional() leadId?: string;
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() partnerId?: string;
  @ApiPropertyOptional() callContactType?: string;
  @ApiPropertyOptional() meetingNoShow?: boolean;
}

class OutcomeReasonDto {
  @ApiProperty({ example: "Não atendeu" }) reason!: string;
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrada") || msg.includes("não encontrado")) throw new NotFoundException(msg);
  if (msg.includes("Não autorizado")) throw new UnauthorizedException(msg);
  throw new Error(msg);
}

function serializeActivity(a: Activity) {
  return {
    id: a.id.toString(),
    ownerId: a.ownerId,
    type: a.type,
    subject: a.subject,
    description: a.description ?? null,
    dueDate: a.dueDate ?? null,
    completed: a.completed,
    completedAt: a.completedAt ?? null,
    failedAt: a.failedAt ?? null,
    failReason: a.failReason ?? null,
    skippedAt: a.skippedAt ?? null,
    skipReason: a.skipReason ?? null,
    dealId: a.dealId ?? null,
    additionalDealIds: a.additionalDealIds ?? null,
    contactId: a.contactId ?? null,
    contactIds: a.contactIds ?? null,
    leadContactIds: a.leadContactIds ?? null,
    leadId: a.leadId ?? null,
    organizationId: a.organizationId ?? null,
    partnerId: a.partnerId ?? null,
    callContactType: a.callContactType ?? null,
    meetingNoShow: a.meetingNoShow,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/* ─── Controller ────────────────────────────────────────────────────────────── */

@ApiTags("Activities")
@ApiBearerAuth("JWT")
@Controller("activities")
@UseGuards(JwtAuthGuard)
export class ActivitiesController {
  constructor(
    private readonly getActivities: GetActivitiesUseCase,
    private readonly getActivityById: GetActivityByIdUseCase,
    private readonly createActivity: CreateActivityUseCase,
    private readonly updateActivity: UpdateActivityUseCase,
    private readonly deleteActivity: DeleteActivityUseCase,
    private readonly toggleCompleted: ToggleActivityCompletedUseCase,
    private readonly markFailed: MarkActivityFailedUseCase,
    private readonly markSkipped: MarkActivitySkippedUseCase,
    private readonly revertOutcome: RevertActivityOutcomeUseCase,
    private readonly linkToDeal: LinkActivityToDealUseCase,
    private readonly unlinkFromDeal: UnlinkActivityFromDealUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar atividades" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "completed", required: false, type: Boolean })
  @ApiQuery({ name: "dealId", required: false })
  @ApiQuery({ name: "contactId", required: false })
  @ApiQuery({ name: "leadId", required: false })
  @ApiQuery({ name: "owner", required: false })
  @ApiQuery({ name: "dateFrom", required: false })
  @ApiQuery({ name: "dateTo", required: false })
  @ApiQuery({ name: "outcome", required: false, enum: ["failed", "skipped"] })
  @ApiQuery({ name: "includeArchivedLeads", required: false, type: Boolean })
  @ApiQuery({ name: "sortBy", required: false })
  async list(
    @Query("type") type?: string,
    @Query("completed") completed?: string,
    @Query("dealId") dealId?: string,
    @Query("contactId") contactId?: string,
    @Query("leadId") leadId?: string,
    @Query("owner") owner?: string,
    @Query("dateFrom") dateFrom?: string,
    @Query("dateTo") dateTo?: string,
    @Query("outcome") outcome?: string,
    @Query("includeArchivedLeads") includeArchivedLeads?: string,
    @Query("sortBy") sortBy?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.getActivities.execute({
      requesterId: user!.id,
      requesterRole: user!.role ?? "sdr",
      filters: {
        type,
        completed: completed !== undefined ? completed === "true" : undefined,
        dealId,
        contactId,
        leadId,
        owner,
        dateFrom,
        dateTo,
        outcome,
        includeArchivedLeads: includeArchivedLeads === "true",
        sortBy,
      },
    });
    return result.unwrap().activities;
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar atividade por ID" })
  @ApiParam({ name: "id" })
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getActivityById.execute({
      id, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value.activity;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Criar atividade" })
  @ApiBody({ type: CreateActivityDto })
  async create(@Body() body: CreateActivityDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createActivity.execute({
      ...body,
      ownerId: user.id,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }

  @Patch(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar atividade" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateActivityDto })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateActivityDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateActivity.execute({
      ...body,
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      dueDate: body.dueDate !== undefined
        ? body.dueDate ? new Date(body.dueDate) : null
        : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar atividade" })
  @ApiParam({ name: "id" })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteActivity.execute({
      id, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
  }

  @Patch(":id/toggle-completed")
  @HttpCode(200)
  @ApiOperation({ summary: "Alternar status de conclusão da atividade" })
  @ApiParam({ name: "id" })
  async toggleCompleted_(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.toggleCompleted.execute({
      id, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }

  @Patch(":id/fail")
  @HttpCode(200)
  @ApiOperation({ summary: "Marcar atividade como falha" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: OutcomeReasonDto })
  async fail(@Param("id") id: string, @Body() body: OutcomeReasonDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.markFailed.execute({
      id, reason: body.reason, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }

  @Patch(":id/skip")
  @HttpCode(200)
  @ApiOperation({ summary: "Marcar atividade como pulada" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: OutcomeReasonDto })
  async skip(@Param("id") id: string, @Body() body: OutcomeReasonDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.markSkipped.execute({
      id, reason: body.reason, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }

  @Patch(":id/revert")
  @HttpCode(200)
  @ApiOperation({ summary: "Reverter outcome da atividade (desfazer falha/skip)" })
  @ApiParam({ name: "id" })
  async revert(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.revertOutcome.execute({
      id, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }

  @Post(":id/deals/:dealId")
  @HttpCode(200)
  @ApiOperation({ summary: "Vincular atividade a um deal secundário" })
  @ApiParam({ name: "id" })
  @ApiParam({ name: "dealId" })
  async addDeal(@Param("id") id: string, @Param("dealId") dealId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.linkToDeal.execute({
      id, dealId, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }

  @Delete(":id/deals/:dealId")
  @HttpCode(200)
  @ApiOperation({ summary: "Desvincular atividade de um deal secundário" })
  @ApiParam({ name: "id" })
  @ApiParam({ name: "dealId" })
  async removeDeal(@Param("id") id: string, @Param("dealId") dealId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.unlinkFromDeal.execute({
      id, dealId, requesterId: user.id, requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serializeActivity(result.value.activity);
  }
}
