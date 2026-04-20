import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseGuards, NotFoundException, ForbiddenException,
  UnprocessableEntityException, ConflictException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { Cadence } from "../../enterprise/entities/cadence";
import { CadenceStep } from "../../enterprise/entities/cadence-step";
import {
  CreateCadenceUseCase, UpdateCadenceUseCase, DeleteCadenceUseCase,
  GetCadencesUseCase, GetCadenceByIdUseCase,
  PublishCadenceUseCase, UnpublishCadenceUseCase,
  CreateCadenceStepUseCase, UpdateCadenceStepUseCase, DeleteCadenceStepUseCase,
  ReorderCadenceStepsUseCase, GetCadenceStepsUseCase,
  ApplyCadenceToLeadUseCase, GetLeadCadencesUseCase,
  PauseLeadCadenceUseCase, ResumeLeadCadenceUseCase, CancelLeadCadenceUseCase,
  GetCadenceLeadCountUseCase, BulkApplyCadenceUseCase,
} from "../../application/use-cases/cadences.use-cases";

function serializeCadence(c: Cadence) {
  return {
    id: c.id.toString(),
    name: c.name,
    slug: c.slug,
    description: c.description,
    objective: c.objective,
    durationDays: c.durationDays,
    icpId: c.icpId,
    status: c.status,
    ownerId: c.ownerId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function serializeStep(s: CadenceStep) {
  return {
    id: s.id.toString(),
    cadenceId: s.cadenceId,
    dayNumber: s.dayNumber,
    channel: s.channel,
    activityType: s.activityType,
    subject: s.subject,
    description: s.description,
    order: s.order,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function handleError(err: Left<Error, unknown>): never {
  const e = err.value as Error;
  if (e.name === "CadenceNotFoundError" || e.name === "CadenceStepNotFoundError" || e.name === "LeadCadenceNotFoundError") throw new NotFoundException(e.message);
  if (e.name === "CadenceForbiddenError") throw new ForbiddenException(e.message);
  if (e.name === "CadenceSlugConflictError") throw new ConflictException(e.message);
  throw new UnprocessableEntityException(e.message);
}

@ApiTags("cadences")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cadences")
export class CadencesController {
  constructor(
    private readonly createCadence: CreateCadenceUseCase,
    private readonly updateCadence: UpdateCadenceUseCase,
    private readonly deleteCadence: DeleteCadenceUseCase,
    private readonly getCadences: GetCadencesUseCase,
    private readonly getCadenceById: GetCadenceByIdUseCase,
    private readonly publishCadence: PublishCadenceUseCase,
    private readonly unpublishCadence: UnpublishCadenceUseCase,
    private readonly createStep: CreateCadenceStepUseCase,
    private readonly updateStep: UpdateCadenceStepUseCase,
    private readonly deleteStep: DeleteCadenceStepUseCase,
    private readonly reorderSteps: ReorderCadenceStepsUseCase,
    private readonly getSteps: GetCadenceStepsUseCase,
    private readonly applyToLead: ApplyCadenceToLeadUseCase,
    private readonly getLeadCadences: GetLeadCadencesUseCase,
    private readonly pauseLeadCadence: PauseLeadCadenceUseCase,
    private readonly resumeLeadCadence: ResumeLeadCadenceUseCase,
    private readonly cancelLeadCadence: CancelLeadCadenceUseCase,
    private readonly getCadenceLeadCount: GetCadenceLeadCountUseCase,
    private readonly bulkApply: BulkApplyCadenceUseCase,
  ) {}

  // ── Static routes FIRST to avoid `:id` collision ────────────────────────────

  @Get("lead/:leadId")
  async listLeadCadences(@Param("leadId") leadId: string) {
    const r = await this.getLeadCadences.execute({ leadId });
    if (r.isLeft()) handleError(r);
    return r.unwrap();
  }

  @Patch("steps/:stepId")
  async updateStepRoute(@Param("stepId") stepId: string, @Body() body: {
    dayNumber?: number; channel?: string; subject?: string; description?: string; order?: number;
  }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.updateStep.execute({ stepId, ...body, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return serializeStep(r.unwrap());
  }

  @Delete("steps/:stepId")
  async deleteStepRoute(@Param("stepId") stepId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.deleteStep.execute({ stepId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Patch("lead-cadences/:leadCadenceId/pause")
  async pause(@Param("leadCadenceId") leadCadenceId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.pauseLeadCadence.execute({ leadCadenceId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Patch("lead-cadences/:leadCadenceId/resume")
  async resume(@Param("leadCadenceId") leadCadenceId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.resumeLeadCadence.execute({ leadCadenceId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Patch("lead-cadences/:leadCadenceId/cancel")
  async cancel(@Param("leadCadenceId") leadCadenceId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.cancelLeadCadence.execute({ leadCadenceId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  // ── Cadence CRUD ─────────────────────────────────────────────────────────────

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser, @Query("icpId") icpId?: string) {
    const r = await this.getCadences.execute({ requesterId: user.id, icpId });
    if (r.isLeft()) handleError(r);
    return r.unwrap().map(serializeCadence);
  }

  @Post()
  async create(@Body() body: {
    name: string; slug?: string; description?: string;
    objective?: string; durationDays?: number; icpId?: string;
  }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.createCadence.execute({ ...body, ownerId: user.id });
    if (r.isLeft()) handleError(r);
    return serializeCadence(r.unwrap());
  }

  @Get(":id/lead-count")
  async leadCount(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.getCadenceLeadCount.execute({ cadenceId: id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return r.unwrap();
  }

  @Get(":id")
  async getOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.getCadenceById.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return serializeCadence(r.unwrap());
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: {
    name?: string; slug?: string; description?: string;
    objective?: string; durationDays?: number; icpId?: string;
  }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.updateCadence.execute({ id, ...body, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return serializeCadence(r.unwrap());
  }

  @Delete(":id")
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.deleteCadence.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Patch(":id/publish")
  async publish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.publishCadence.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Patch(":id/unpublish")
  async unpublish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.unpublishCadence.execute({ id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  // ── Steps ────────────────────────────────────────────────────────────────────

  @Get(":cadenceId/steps")
  async listSteps(@Param("cadenceId") cadenceId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.getSteps.execute({ cadenceId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return r.unwrap().map(serializeStep);
  }

  @Post(":cadenceId/steps")
  async createStepRoute(@Param("cadenceId") cadenceId: string, @Body() body: {
    dayNumber: number; channel: string; subject: string; description?: string; order?: number;
  }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.createStep.execute({ cadenceId, ...body, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return serializeStep(r.unwrap());
  }

  @Patch(":cadenceId/steps/reorder")
  async reorderStepsRoute(@Param("cadenceId") cadenceId: string, @Body() body: { orderedStepIds: string[] }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.reorderSteps.execute({ cadenceId, orderedStepIds: body.orderedStepIds, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Post("bulk-apply")
  async bulkApplyRoute(@Body() body: {
    cadenceId: string; leadIds: string[]; startDate?: string; notes?: string;
  }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.bulkApply.execute({
      cadenceId: body.cadenceId,
      leadIds: body.leadIds,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      notes: body.notes,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (r.isLeft()) handleError(r);
    return r.unwrap();
  }

  @Post(":cadenceId/apply")
  async apply(@Param("cadenceId") cadenceId: string, @Body() body: {
    leadId: string; startDate?: string; notes?: string;
  }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.applyToLead.execute({
      cadenceId,
      leadId: body.leadId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      notes: body.notes,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (r.isLeft()) handleError(r);
    return r.unwrap();
  }
}
