import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  ApiProperty,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { Left } from "@/core/either";
import { GetDealsUseCase } from "@/domain/deals/application/use-cases/get-deals.use-case";
import { GetDealByIdUseCase } from "@/domain/deals/application/use-cases/get-deal-by-id.use-case";
import { CreateDealUseCase, type CreateDealInput } from "@/domain/deals/application/use-cases/create-deal.use-case";
import { UpdateDealUseCase, type UpdateDealInput } from "@/domain/deals/application/use-cases/update-deal.use-case";
import { DeleteDealUseCase } from "@/domain/deals/application/use-cases/delete-deal.use-case";
import { UpdateDealStageUseCase } from "@/domain/deals/application/use-cases/update-deal-stage.use-case";
import type { Deal } from "@/domain/deals/enterprise/entities/deal";

/* ─── DTOs ──────────────────────────────────────────────────────────────── */

class CreateDealDto {
  @ApiProperty({ example: "Website Empresa ABC" })
  title!: string;

  @ApiPropertyOptional({ example: "Desenvolvimento de site institucional" })
  description?: string;

  @ApiPropertyOptional({ example: 15000 })
  value?: number;

  @ApiPropertyOptional({ example: "BRL" })
  currency?: string;

  @ApiProperty({ example: "clxyz..." })
  stageId!: string;

  @ApiPropertyOptional()
  contactId?: string;

  @ApiPropertyOptional()
  organizationId?: string;

  @ApiPropertyOptional({ example: "2025-12-31", description: "Data prevista de fechamento (YYYY-MM-DD)" })
  expectedCloseDate?: string;
}

class UpdateDealDto {
  @ApiPropertyOptional() title?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() value?: number;
  @ApiPropertyOptional() currency?: string;
  @ApiPropertyOptional({ enum: ["open", "won", "lost"] }) status?: "open" | "won" | "lost";
  @ApiPropertyOptional() contactId?: string;
  @ApiPropertyOptional() organizationId?: string;
  @ApiPropertyOptional() expectedCloseDate?: string;
}

class UpdateDealStageDto {
  @ApiProperty({ example: "clxyz...", description: "ID da nova etapa" })
  stageId!: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado") || msg.includes("não encontrada")) throw new NotFoundException(msg);
  if (msg.includes("Não autorizado")) throw new UnauthorizedException(msg);
  throw new Error(msg);
}

function serialize(deal: Deal) {
  return {
    id: deal.id.toString(),
    ownerId: deal.ownerId,
    title: deal.title,
    description: deal.description,
    value: deal.value,
    currency: deal.currency,
    status: deal.status,
    closedAt: deal.closedAt,
    stageId: deal.stageId,
    contactId: deal.contactId,
    organizationId: deal.organizationId,
    expectedCloseDate: deal.expectedCloseDate,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
  };
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Deals")
@ApiBearerAuth("JWT")
@Controller("deals")
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(
    private readonly getDeals: GetDealsUseCase,
    private readonly getDealById: GetDealByIdUseCase,
    private readonly createDeal: CreateDealUseCase,
    private readonly updateDeal: UpdateDealUseCase,
    private readonly deleteDeal: DeleteDealUseCase,
    private readonly updateStage: UpdateDealStageUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar deals" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "owner", required: false, description: "Admin: 'all', 'mine' ou userId" })
  @ApiQuery({ name: "stageId", required: false })
  @ApiQuery({ name: "status", required: false, enum: ["open", "won", "lost"] })
  @ApiQuery({ name: "organizationId", required: false })
  @ApiQuery({ name: "contactId", required: false })
  @ApiResponse({ status: 200, description: "Lista de deals" })
  async list(
    @Query("search") search?: string,
    @Query("owner") owner?: string,
    @Query("stageId") stageId?: string,
    @Query("status") status?: string,
    @Query("organizationId") organizationId?: string,
    @Query("contactId") contactId?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.getDeals.execute({
      requesterId: user!.id,
      requesterRole: user!.role ?? "sdr",
      filters: { search, owner, stageId, status, organizationId, contactId },
    });
    return result.unwrap().deals;
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar deal por ID com relações completas" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getDealById.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value.deal;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Criar deal" })
  @ApiBody({ type: CreateDealDto })
  @ApiResponse({ status: 201 })
  async create(@Body() body: Omit<CreateDealInput, "ownerId">, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createDeal.execute({
      ...body,
      ownerId: user.id,
      expectedCloseDate: (body as any).expectedCloseDate ? new Date((body as any).expectedCloseDate) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.deal);
  }

  @Patch(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar deal" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateDealDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(
    @Param("id") id: string,
    @Body() body: Omit<UpdateDealInput, "id" | "requesterId" | "requesterRole">,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateDeal.execute({
      ...body,
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      expectedCloseDate: (body as any).expectedCloseDate ? new Date((body as any).expectedCloseDate) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.deal);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar deal" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteDeal.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
  }

  @Patch(":id/stage")
  @HttpCode(200)
  @ApiOperation({ summary: "Mover deal para outra etapa (atualiza status automaticamente)" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateDealStageDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async moveStage(
    @Param("id") id: string,
    @Body() body: UpdateDealStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateStage.execute({
      id,
      stageId: body.stageId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.deal);
  }
}
