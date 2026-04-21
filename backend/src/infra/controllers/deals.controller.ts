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
import { UpdateStageHistoryDateUseCase } from "@/domain/deals/application/use-cases/update-stage-history-date.use-case";
import {
  GetDealTechStackUseCase, AddCategoryToDealUseCase, RemoveCategoryFromDealUseCase,
  AddLanguageToDealUseCase, RemoveLanguageFromDealUseCase, SetPrimaryLanguageUseCase,
  AddFrameworkToDealUseCase, RemoveFrameworkFromDealUseCase,
} from "@/domain/deals/application/use-cases/deal-tech-stack.use-cases";
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

  @ApiPropertyOptional()
  leadId?: string;

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
  @ApiPropertyOptional() leadId?: string;
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
    leadId: deal.leadId,
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
    private readonly updateStageHistoryDate: UpdateStageHistoryDateUseCase,
    private readonly getDealTechStack: GetDealTechStackUseCase,
    private readonly addCategory: AddCategoryToDealUseCase,
    private readonly removeCategory: RemoveCategoryFromDealUseCase,
    private readonly addLanguage: AddLanguageToDealUseCase,
    private readonly removeLanguage: RemoveLanguageFromDealUseCase,
    private readonly setPrimaryLanguage: SetPrimaryLanguageUseCase,
    private readonly addFramework: AddFrameworkToDealUseCase,
    private readonly removeFramework: RemoveFrameworkFromDealUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar deals" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "owner", required: false, description: "Admin: 'all', 'mine' ou userId" })
  @ApiQuery({ name: "stageId", required: false })
  @ApiQuery({ name: "status", required: false, enum: ["open", "won", "lost"] })
  @ApiQuery({ name: "organizationId", required: false })
  @ApiQuery({ name: "contactId", required: false })
  @ApiQuery({ name: "valueRange", required: false, description: "'0-10000', '10000-50000', '50000-100000', '100000+', 'all'" })
  @ApiQuery({ name: "sortBy", required: false, enum: ["value", "title", "createdAt"] })
  @ApiQuery({ name: "sortOrder", required: false, enum: ["asc", "desc"] })
  @ApiQuery({ name: "closedMonth", required: false, description: "'all', 'YYYY-MM'" })
  @ApiResponse({ status: 200, description: "Lista de deals" })
  async list(
    @Query("search") search?: string,
    @Query("owner") owner?: string,
    @Query("stageId") stageId?: string,
    @Query("status") status?: string,
    @Query("organizationId") organizationId?: string,
    @Query("contactId") contactId?: string,
    @Query("valueRange") valueRange?: string,
    @Query("sortBy") sortBy?: string,
    @Query("sortOrder") sortOrder?: string,
    @Query("closedMonth") closedMonth?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const sortOrderTyped = sortOrder === "desc" ? "desc" : sortOrder === "asc" ? "asc" : undefined;
    const result = await this.getDeals.execute({
      requesterId: user!.id,
      requesterRole: user!.role ?? "sdr",
      filters: { search, owner, stageId, status, organizationId, contactId, valueRange, sortBy, sortOrder: sortOrderTyped, closedMonth },
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

  @Patch("stage-history/:historyId")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar data de um registro de histórico de etapa" })
  @ApiParam({ name: "historyId" })
  @ApiResponse({ status: 200, description: "Data atualizada" })
  @ApiResponse({ status: 404, description: "Registro não encontrado" })
  async updateStageHistory(
    @Param("historyId") historyId: string,
    @Body() body: { changedAt: string },
  ) {
    const result = await this.updateStageHistoryDate.execute({
      historyId,
      changedAt: new Date(body.changedAt),
    });
    if (result.isLeft()) handleError(result);
    return result.value;
  }

  // ── Tech Stack ────────────────────────────────────────────────────────────────

  @Get(":id/tech-stack")
  @ApiOperation({ summary: "Buscar tech stack do deal" })
  async getTechStack(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.getDealTechStack.execute({ dealId: id, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
    return r.value;
  }

  @Post(":id/tech-stack/categories/:categoryId")
  @HttpCode(204)
  async addCategoryRoute(@Param("id") id: string, @Param("categoryId") categoryId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.addCategory.execute({ dealId: id, categoryId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Delete(":id/tech-stack/categories/:categoryId")
  @HttpCode(204)
  async removeCategoryRoute(@Param("id") id: string, @Param("categoryId") categoryId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.removeCategory.execute({ dealId: id, categoryId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Post(":id/tech-stack/languages/:languageId")
  @HttpCode(204)
  async addLanguageRoute(@Param("id") id: string, @Param("languageId") languageId: string, @Body() body: { isPrimary?: boolean }, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.addLanguage.execute({ dealId: id, languageId, isPrimary: body.isPrimary, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Patch(":id/tech-stack/languages/:languageId/primary")
  @HttpCode(204)
  async setPrimaryLanguageRoute(@Param("id") id: string, @Param("languageId") languageId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.setPrimaryLanguage.execute({ dealId: id, languageId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Delete(":id/tech-stack/languages/:languageId")
  @HttpCode(204)
  async removeLanguageRoute(@Param("id") id: string, @Param("languageId") languageId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.removeLanguage.execute({ dealId: id, languageId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Post(":id/tech-stack/frameworks/:frameworkId")
  @HttpCode(204)
  async addFrameworkRoute(@Param("id") id: string, @Param("frameworkId") frameworkId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.addFramework.execute({ dealId: id, frameworkId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }

  @Delete(":id/tech-stack/frameworks/:frameworkId")
  @HttpCode(204)
  async removeFrameworkRoute(@Param("id") id: string, @Param("frameworkId") frameworkId: string, @CurrentUser() user: AuthenticatedUser) {
    const r = await this.removeFramework.execute({ dealId: id, frameworkId, requesterId: user.id, requesterRole: user.role ?? "sdr" });
    if (r.isLeft()) handleError(r);
  }
}
