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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { Left } from "@/core/either";
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
import type { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";
import type { CampaignSend } from "@/domain/campaigns/enterprise/entities/campaign-send";
import type { CampaignStep, StepType } from "@/domain/campaigns/enterprise/entities/campaign-step";

/* ─── DTOs ──────────────────────────────────────────────────────────────── */

class CreateCampaignDto {
  @ApiProperty({ example: "Black Friday 2025", description: "Nome da campanha" })
  name!: string;

  @ApiProperty({ example: "minha-instancia", description: "Nome da instância Evolution API" })
  instanceName!: string;

  @ApiPropertyOptional({ example: "Campanha de promoção Black Friday" })
  description?: string;

  @ApiPropertyOptional({
    example: '{"minDelay":3,"maxDelay":8,"maxPerHour":30}',
    description: "Configuração anti-bloqueio (JSON string)",
  })
  antiBlockConfig?: string;
}

class AddStepDto {
  @ApiProperty({
    example: "TEXT",
    enum: ["TEXT", "MEDIA", "TYPING", "DELAY"],
    description: "Tipo do step da campanha",
  })
  type!: StepType;

  @ApiPropertyOptional({ example: "Olá {{nome}}, tudo bem?" })
  text?: string;

  @ApiPropertyOptional({ example: "https://example.com/image.jpg" })
  mediaUrl?: string;

  @ApiPropertyOptional({ example: "Confira nossa oferta!" })
  mediaCaption?: string;

  @ApiPropertyOptional({ example: "image", enum: ["image", "video", "audio", "document"] })
  mediaType?: string;

  @ApiPropertyOptional({ example: 5, description: "Segundos de delay (tipo DELAY)" })
  delaySeconds?: number;

  @ApiPropertyOptional({ example: 3, description: "Segundos simulando digitação (tipo TYPING)" })
  typingSeconds?: number;
}

class RecipientDto {
  @ApiProperty({ example: "+5511999999999", description: "Número de telefone com DDI" })
  phone!: string;

  @ApiPropertyOptional({ example: "lead_id_here", description: "ID do Lead associado" })
  leadId?: string;
}

class AddRecipientsDto {
  @ApiProperty({ type: [RecipientDto], description: "Lista de destinatários" })
  recipients!: Array<{ phone: string; leadId?: string }>;
}

class CampaignResponseDto {
  @ApiProperty({ example: "cuid_here" })
  id!: string;

  @ApiProperty({ example: "owner_id_here" })
  ownerId!: string;

  @ApiProperty({ example: "Black Friday 2025" })
  name!: string;

  @ApiProperty({ example: "minha-instancia" })
  instanceName!: string;

  @ApiPropertyOptional({ example: "Campanha de promoção" })
  description?: string;

  @ApiProperty({ example: "DRAFT", enum: ["DRAFT", "ACTIVE", "PAUSED", "DONE"] })
  status!: string;

  @ApiPropertyOptional()
  antiBlockConfig?: string;

  @ApiProperty({ example: 3, description: "Quantidade de steps" })
  stepsCount!: number;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

class CampaignStepResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  campaignId!: string;

  @ApiProperty()
  order!: number;

  @ApiProperty({ enum: ["TEXT", "MEDIA", "TYPING", "DELAY"] })
  type!: string;

  @ApiPropertyOptional()
  text?: string;

  @ApiPropertyOptional()
  mediaUrl?: string;

  @ApiPropertyOptional()
  mediaCaption?: string;

  @ApiPropertyOptional()
  mediaType?: string;

  @ApiPropertyOptional()
  delaySeconds?: number;

  @ApiPropertyOptional()
  typingSeconds?: number;
}

class OkResponseDto {
  @ApiProperty({ example: true })
  ok!: boolean;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrada")) throw new NotFoundException(msg);
  if (msg.includes("Não autorizado"))  throw new UnauthorizedException(msg);
  throw new Error(msg);
}

function serializeCampaign(c: Campaign) {
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

function serializeStep(s: CampaignStep) {
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

function serializeSend(s: CampaignSend) {
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

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Campaigns")
@ApiBearerAuth("JWT")
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
  @ApiOperation({ summary: "Criar campanha" })
  @ApiBody({ type: CreateCampaignDto })
  @ApiResponse({ status: 201, description: "Campanha criada com sucesso", type: CampaignResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createCampaign.execute({ ownerId: user.id, ...dto });
    if (result.isLeft()) handleError(result);
    return serializeCampaign(result.value.campaign);
  }

  @Get()
  @ApiOperation({ summary: "Listar campanhas do usuário autenticado" })
  @ApiResponse({ status: 200, description: "Lista de campanhas", type: [CampaignResponseDto] })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const result = await this.listCampaigns.execute({ ownerId: user.id });
    return result.unwrap().campaigns.map(serializeCampaign);
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar campanha por ID (inclui envios)" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiResponse({ status: 200, description: "Campanha com envios" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    const { campaign, sends } = result.value;
    return { ...serializeCampaign(campaign), sends: sends.map(serializeSend) };
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar campanha" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiResponse({ status: 204, description: "Campanha deletada com sucesso" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result);
  }

  /* ── Actions ── */

  @Post(":id/start")
  @HttpCode(200)
  @ApiOperation({ summary: "Iniciar campanha (DRAFT → ACTIVE)" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiResponse({ status: 200, description: "Campanha iniciada", type: OkResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
  async start(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.startCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    return { ok: true };
  }

  @Post(":id/pause")
  @HttpCode(200)
  @ApiOperation({ summary: "Pausar campanha (ACTIVE → PAUSED)" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiResponse({ status: 200, description: "Campanha pausada", type: OkResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
  async pause(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.pauseCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    return { ok: true };
  }

  @Post(":id/resume")
  @HttpCode(200)
  @ApiOperation({ summary: "Retomar campanha (PAUSED → ACTIVE)" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiResponse({ status: 200, description: "Campanha retomada", type: OkResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
  async resume(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.resumeCampaign.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    return { ok: true };
  }

  /* ── Steps ── */

  @Post(":id/steps")
  @ApiOperation({ summary: "Adicionar step à campanha" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiBody({ type: AddStepDto })
  @ApiResponse({ status: 201, description: "Step adicionado", type: CampaignStepResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
  async addCampaignStep(
    @Param("id") id: string,
    @Body() dto: AddStepDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.addStep.execute({ campaignId: id, ownerId: user.id, ...dto });
    if (result.isLeft()) handleError(result);
    return serializeStep(result.value.step);
  }

  /* ── Recipients ── */

  @Post(":id/recipients")
  @ApiOperation({ summary: "Adicionar destinatários à campanha" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiBody({ type: AddRecipientsDto })
  @ApiResponse({ status: 201, description: "Destinatários adicionados" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
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
    if (result.isLeft()) handleError(result);
    return result.value;
  }

  @Get(":id/stats")
  @ApiOperation({ summary: "Estatísticas da campanha" })
  @ApiParam({ name: "id", description: "ID da campanha" })
  @ApiResponse({ status: 200, description: "Estatísticas: total, sent, failed, pending" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Campanha não encontrada" })
  async stats(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getCampaignStats.execute({ campaignId: id, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    return result.value;
  }
}
