import {
  Body, Controller, Delete, Get, HttpCode,
  NotFoundException, Param, Patch, Post, Query,
  UnprocessableEntityException, UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam,
  ApiResponse, ApiTags, ApiProperty, ApiPropertyOptional,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { Left } from "@/core/either";
import { GetPipelinesUseCase } from "@/domain/pipelines/application/use-cases/get-pipelines.use-case";
import { GetPipelineByIdUseCase } from "@/domain/pipelines/application/use-cases/get-pipeline-by-id.use-case";
import { CreatePipelineUseCase } from "@/domain/pipelines/application/use-cases/create-pipeline.use-case";
import { UpdatePipelineUseCase } from "@/domain/pipelines/application/use-cases/update-pipeline.use-case";
import { DeletePipelineUseCase } from "@/domain/pipelines/application/use-cases/delete-pipeline.use-case";
import { SetDefaultPipelineUseCase } from "@/domain/pipelines/application/use-cases/set-default-pipeline.use-case";
import { CreateStageUseCase } from "@/domain/pipelines/application/use-cases/create-stage.use-case";
import { UpdateStageUseCase } from "@/domain/pipelines/application/use-cases/update-stage.use-case";
import { DeleteStageUseCase } from "@/domain/pipelines/application/use-cases/delete-stage.use-case";
import { ReorderStagesUseCase } from "@/domain/pipelines/application/use-cases/reorder-stages.use-case";
import { GetPipelineViewUseCase } from "@/domain/pipelines/application/use-cases/get-pipeline-view.use-case";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";

/* ─── DTOs ───────────────────────────────────────────────────────────────── */

class CreatePipelineDto {
  @ApiProperty({ example: "Pipeline de Vendas" })
  name!: string;

  @ApiPropertyOptional({ example: false })
  isDefault?: boolean;
}

class UpdatePipelineDto {
  @ApiPropertyOptional({ example: "Pipeline Principal" })
  name?: string;

  @ApiPropertyOptional({ example: true })
  isDefault?: boolean;
}

class CreateStageDto {
  @ApiProperty({ example: "Qualificação" })
  name!: string;

  @ApiProperty({ example: 1 })
  order!: number;

  @ApiProperty({ example: 10, description: "Probabilidade de fechamento (0-100)" })
  probability!: number;

  @ApiProperty({ example: "pipeline-id-here" })
  pipelineId!: string;
}

class UpdateStageDto {
  @ApiPropertyOptional({ example: "Negociação" })
  name?: string;

  @ApiPropertyOptional({ example: 3 })
  order?: number;

  @ApiPropertyOptional({ example: 60 })
  probability?: number;
}

class ReorderStagesDto {
  @ApiProperty({ type: [String], description: "IDs dos estágios na nova ordem" })
  stageIds!: string[];
}

/* ─── Helper ─────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  throw new UnprocessableEntityException(msg);
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Pipelines")
@ApiBearerAuth("JWT")
@Controller("pipelines")
@UseGuards(JwtAuthGuard)
export class PipelinesController {
  constructor(
    private readonly getPipelines: GetPipelinesUseCase,
    private readonly getPipelineById: GetPipelineByIdUseCase,
    private readonly createPipeline: CreatePipelineUseCase,
    private readonly updatePipeline: UpdatePipelineUseCase,
    private readonly deletePipeline: DeletePipelineUseCase,
    private readonly setDefaultPipeline: SetDefaultPipelineUseCase,
    private readonly createStage: CreateStageUseCase,
    private readonly updateStage: UpdateStageUseCase,
    private readonly deleteStage: DeleteStageUseCase,
    private readonly reorderStages: ReorderStagesUseCase,
    private readonly getPipelineView: GetPipelineViewUseCase,
  ) {}

  // ─── Pipelines ──────────────────────────────────────────────────────────

  @Get("view")
  @ApiOperation({ summary: "Buscar pipeline com estágios e deals para o kanban" })
  async view(
    @Query("pipelineId") pipelineId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.getPipelineView.execute(user.id, user.role ?? "sdr", pipelineId);
    if (result.isLeft()) throw new NotFoundException(result.value.message);
    return result.value.view;
  }

  @Get()
  @ApiOperation({ summary: "Listar todos os pipelines com estágios" })
  @ApiResponse({ status: 200 })
  async list() {
    const result = await this.getPipelines.execute();
    return result.value.pipelines;
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar pipeline por ID" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async get(@Param("id") id: string) {
    const result = await this.getPipelineById.execute(id);
    if (result.isLeft()) handleError(result);
    return result.value.pipeline;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Criar pipeline (auto-cria 4 estágios padrão)" })
  @ApiBody({ type: CreatePipelineDto })
  @ApiResponse({ status: 201 })
  async create(@Body() body: CreatePipelineDto) {
    const result = await this.createPipeline.execute(body);
    if (result.isLeft()) handleError(result);
    const p = result.value.pipeline;
    return { id: p.id.toString(), name: p.name, isDefault: p.isDefault, createdAt: p.createdAt, updatedAt: p.updatedAt };
  }

  @Patch(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar pipeline" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdatePipelineDto })
  async update(@Param("id") id: string, @Body() body: UpdatePipelineDto) {
    const result = await this.updatePipeline.execute({ id, ...body });
    if (result.isLeft()) handleError(result);
    const p = result.value.pipeline;
    return { id: p.id.toString(), name: p.name, isDefault: p.isDefault, createdAt: p.createdAt, updatedAt: p.updatedAt };
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar pipeline (não pode ser o padrão)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 422, description: "Pipeline é o padrão" })
  async remove(@Param("id") id: string) {
    const result = await this.deletePipeline.execute(id);
    if (result.isLeft()) handleError(result);
  }

  @Patch(":id/set-default")
  @HttpCode(200)
  @ApiOperation({ summary: "Definir pipeline como padrão" })
  @ApiParam({ name: "id" })
  async setDefault(@Param("id") id: string) {
    const result = await this.setDefaultPipeline.execute(id);
    if (result.isLeft()) handleError(result);
    const p = result.value.pipeline;
    return { id: p.id.toString(), name: p.name, isDefault: p.isDefault, updatedAt: p.updatedAt };
  }

  // ─── Stages ─────────────────────────────────────────────────────────────

  @Post("stages")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar estágio" })
  @ApiBody({ type: CreateStageDto })
  @ApiResponse({ status: 201 })
  async createStageRoute(@Body() body: CreateStageDto) {
    const result = await this.createStage.execute(body);
    if (result.isLeft()) handleError(result);
    const s = result.value.stage;
    return { id: s.id.toString(), name: s.name, order: s.order, probability: s.probability, pipelineId: s.pipelineId, createdAt: s.createdAt, updatedAt: s.updatedAt };
  }

  @Patch("stages/:id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar estágio" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdateStageDto })
  async updateStageRoute(@Param("id") id: string, @Body() body: UpdateStageDto) {
    const result = await this.updateStage.execute({ id, ...body });
    if (result.isLeft()) handleError(result);
    const s = result.value.stage;
    return { id: s.id.toString(), name: s.name, order: s.order, probability: s.probability, pipelineId: s.pipelineId, createdAt: s.createdAt, updatedAt: s.updatedAt };
  }

  @Delete("stages/:id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar estágio (não pode ter deals)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 422, description: "Estágio possui deals" })
  async deleteStageRoute(@Param("id") id: string) {
    const result = await this.deleteStage.execute(id);
    if (result.isLeft()) handleError(result);
  }

  @Patch(":pipelineId/stages/reorder")
  @HttpCode(200)
  @ApiOperation({ summary: "Reordenar estágios de um pipeline" })
  @ApiParam({ name: "pipelineId" })
  @ApiBody({ type: ReorderStagesDto })
  async reorderStagesRoute(@Param("pipelineId") pipelineId: string, @Body() body: ReorderStagesDto) {
    const result = await this.reorderStages.execute({ pipelineId, stageIds: body.stageIds });
    if (result.isLeft()) handleError(result);
    return { ok: true };
  }
}
