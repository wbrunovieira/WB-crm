import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { CreateCampaignUseCase } from "@/domain/campaigns/application/use-cases/create-campaign.use-case";
import { ListCampaignsUseCase } from "@/domain/campaigns/application/use-cases/list-campaigns.use-case";
import { GetCampaignUseCase } from "@/domain/campaigns/application/use-cases/get-campaign.use-case";
import { DeleteCampaignUseCase } from "@/domain/campaigns/application/use-cases/delete-campaign.use-case";
import { StartCampaignUseCase } from "@/domain/campaigns/application/use-cases/start-campaign.use-case";
import { PauseCampaignUseCase } from "@/domain/campaigns/application/use-cases/pause-campaign.use-case";
import { ResumeCampaignUseCase } from "@/domain/campaigns/application/use-cases/resume-campaign.use-case";
import { AddCampaignStepUseCase } from "@/domain/campaigns/application/use-cases/add-campaign-step.use-case";
import { AddRecipientsUseCase } from "@/domain/campaigns/application/use-cases/add-recipients.use-case";
import { GetCampaignStatsUseCase } from "@/domain/campaigns/application/use-cases/get-campaign-stats.use-case";
import type { StepType } from "@/domain/campaigns/enterprise/entities/campaign-step";

/* ─── DTOs ──────────────────────────────────────────────────────────────── */

class CreateCampaignDto {
  name!: string;
  instanceName!: string;
  description?: string;
  antiBlockConfig?: string;
}

class AddStepDto {
  type!: StepType;
  text?: string;
  mediaUrl?: string;
  mediaCaption?: string;
  mediaType?: string;
  delaySeconds?: number;
  typingSeconds?: number;
}

class AddRecipientsDto {
  recipients!: Array<{ phone: string; leadId?: string }>;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function handleError(result: { isLeft(): boolean; value: Error }): never {
  const msg = result.value.message;
  if (msg.includes("não encontrada")) throw new NotFoundException(msg);
  if (msg.includes("Não autorizado"))  throw new UnauthorizedException(msg);
  throw new Error(msg);
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@Controller("campaigns")
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly createCampaign: CreateCampaignUseCase,
    private readonly listCampaigns: ListCampaignsUseCase,
    private readonly getCampaign: GetCampaignUseCase,
    private readonly deleteCampaign: DeleteCampaignUseCase,
    private readonly startCampaign: StartCampaignUseCase,
    private readonly pauseCampaign: PauseCampaignUseCase,
    private readonly resumeCampaign: ResumeCampaignUseCase,
    private readonly addStep: AddCampaignStepUseCase,
    private readonly addRecipients: AddRecipientsUseCase,
    private readonly getCampaignStats: GetCampaignStatsUseCase,
  ) {}

  /* ── CRUD ── */

  @Post()
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createCampaign.execute({ ownerId: user.id, ...dto });
    if (result.isLeft()) handleError(result as any);
    const { campaign } = (result as any).value;
    return this.serializeCampaign(campaign);
  }

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.listCampaigns.execute({ ownerId: user.id });
    const { campaigns } = (result as any).value;
    return campaigns.map((c: any) => this.serializeCampaign(c));
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result as any);
    const { campaign, sends } = (result as any).value;
    return { ...this.serializeCampaign(campaign), sends: sends.map((s: any) => this.serializeSend(s)) };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result as any);
  }

  /* ── Actions ── */

  @Post(":id/start")
  @HttpCode(200)
  async start(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.startCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result as any);
    return { ok: true };
  }

  @Post(":id/pause")
  @HttpCode(200)
  async pause(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.pauseCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result as any);
    return { ok: true };
  }

  @Post(":id/resume")
  @HttpCode(200)
  async resume(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.resumeCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result as any);
    return { ok: true };
  }

  /* ── Steps ── */

  @Post(":id/steps")
  async addCampaignStep(
    @Param("id") id: string,
    @Body() dto: AddStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.addStep.execute({ campaignId: id, ownerId: user.id, ...dto });
    if (result.isLeft()) handleError(result as any);
    const { step } = (result as any).value;
    return this.serializeStep(step);
  }

  /* ── Recipients ── */

  @Post(":id/recipients")
  async addCampaignRecipients(
    @Param("id") id: string,
    @Body() dto: AddRecipientsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.addRecipients.execute({
      campaignId: id,
      ownerId: user.id,
      recipients: dto.recipients,
    });
    if (result.isLeft()) handleError(result as any);
    return (result as any).value;
  }

  @Get(":id/stats")
  async stats(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getCampaignStats.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result as any);
    return (result as any).value;
  }

  /* ── Serializers ── */

  private serializeCampaign(c: any) {
    return {
      id: c.id.toString(),
      ownerId: c.ownerId,
      name: c.name,
      instanceName: c.instanceName,
      description: c.description,
      status: c.status,
      antiBlockConfig: c.antiBlockConfig,
      stepsCount: c.steps.length,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }

  private serializeStep(s: any) {
    return {
      id: s.id.toString(),
      campaignId: s.campaignId,
      order: s.order,
      type: s.type,
      text: s.text,
      mediaUrl: s.mediaUrl,
      mediaCaption: s.mediaCaption,
      mediaType: s.mediaType,
      delaySeconds: s.delaySeconds,
      typingSeconds: s.typingSeconds,
    };
  }

  private serializeSend(s: any) {
    return {
      id: s.id.toString(),
      phone: s.phone,
      leadId: s.leadId,
      status: s.status,
      currentStep: s.currentStep,
      scheduledAt: s.scheduledAt,
      startedAt: s.startedAt,
      finishedAt: s.finishedAt,
      errorMessage: s.errorMessage,
    };
  }
}
