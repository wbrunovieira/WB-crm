import {
  Body, Controller, Delete, Get, HttpCode,
  NotFoundException, Param, Patch, Post, Query,
  UnprocessableEntityException, UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth, ApiBody, ApiOperation, ApiParam,
  ApiQuery, ApiResponse, ApiTags, ApiProperty, ApiPropertyOptional,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { Left } from "@/core/either";
import {
  ShareEntityUseCase,
  UnshareEntityUseCase,
  GetEntitySharesUseCase,
  TransferEntityUseCase,
} from "@/domain/shared-entities/application/use-cases/shared-entities.use-cases";
import type { SharedEntityType } from "@/domain/shared-entities/enterprise/entities/shared-entity";

/* ─── DTOs ───────────────────────────────────────────────────────────────── */

class ShareEntityDto {
  @ApiProperty({ example: "lead", description: "lead | contact | organization | partner | deal" })
  entityType!: SharedEntityType;

  @ApiProperty({ example: "cuid-do-lead" })
  entityId!: string;

  @ApiProperty({ example: "cuid-do-usuario" })
  sharedWithUserId!: string;
}

class TransferEntityDto {
  @ApiProperty({ example: "lead" })
  entityType!: SharedEntityType;

  @ApiProperty({ example: "cuid-do-lead" })
  entityId!: string;

  @ApiProperty({ example: "cuid-do-novo-dono" })
  newOwnerId!: string;
}

/* ─── Helper ─────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  throw new UnprocessableEntityException(msg);
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Shared Entities")
@ApiBearerAuth("JWT")
@Controller("shared-entities")
@UseGuards(JwtAuthGuard)
export class SharedEntitiesController {
  constructor(
    private readonly shareEntity: ShareEntityUseCase,
    private readonly unshareEntity: UnshareEntityUseCase,
    private readonly getEntityShares: GetEntitySharesUseCase,
    private readonly transferEntity: TransferEntityUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar usuários com acesso a uma entidade (admin)" })
  @ApiQuery({ name: "entityType", example: "lead" })
  @ApiQuery({ name: "entityId", example: "cuid-da-entidade" })
  async listShares(
    @Query("entityType") entityType: SharedEntityType,
    @Query("entityId") entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.getEntityShares.execute(entityType, entityId, user.role ?? "");
    if (result.isLeft()) handleError(result);
    return (result.value as { shares: unknown[] }).shares;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Compartilhar entidade com um usuário (admin)" })
  @ApiBody({ type: ShareEntityDto })
  @ApiResponse({ status: 201 })
  @ApiResponse({ status: 422, description: "Já compartilhado ou regra de negócio" })
  async share(@Body() body: ShareEntityDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.shareEntity.execute({
      entityType: body.entityType,
      entityId: body.entityId,
      sharedWithUserId: body.sharedWithUserId,
      requesterId: user.id,
      requesterRole: user.role ?? "",
    });
    if (result.isLeft()) handleError(result);
    const share = (result.value as { share: { id: { toString: () => string }; entityType: string; entityId: string; sharedWithUserId: string; createdAt: Date } }).share;
    return {
      id: share.id.toString(),
      entityType: share.entityType,
      entityId: share.entityId,
      sharedWithUserId: share.sharedWithUserId,
      createdAt: share.createdAt,
    };
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Remover compartilhamento (admin)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 204 })
  async unshare(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.unshareEntity.execute(id, user.role ?? "");
    if (result.isLeft()) handleError(result);
  }

  @Patch("transfer")
  @HttpCode(200)
  @ApiOperation({ summary: "Transferir ownership de uma entidade (admin)" })
  @ApiBody({ type: TransferEntityDto })
  async transfer(@Body() body: TransferEntityDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.transferEntity.execute({
      entityType: body.entityType,
      entityId: body.entityId,
      newOwnerId: body.newOwnerId,
      requesterRole: user.role ?? "",
    });
    if (result.isLeft()) handleError(result);
    return { ok: true };
  }
}
