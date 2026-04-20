import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, HttpCode, UseGuards,
  NotFoundException, UnprocessableEntityException, ForbiddenException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import {
  GetSectorsUseCase, GetSectorByIdUseCase,
  CreateSectorUseCase, UpdateSectorUseCase, DeleteSectorUseCase,
  LinkSectorToLeadUseCase, UnlinkSectorFromLeadUseCase,
  LinkSectorToOrganizationUseCase, UnlinkSectorFromOrganizationUseCase,
} from "../../application/use-cases/sectors.use-cases";

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  if (msg.includes("não pertence")) throw new ForbiddenException(msg);
  throw new UnprocessableEntityException(msg);
}

@ApiTags("sectors")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("sectors")
export class SectorsController {
  constructor(
    private readonly getSectors: GetSectorsUseCase,
    private readonly getSectorById: GetSectorByIdUseCase,
    private readonly createSector: CreateSectorUseCase,
    private readonly updateSector: UpdateSectorUseCase,
    private readonly deleteSector: DeleteSectorUseCase,
    private readonly linkToLead: LinkSectorToLeadUseCase,
    private readonly unlinkFromLead: UnlinkSectorFromLeadUseCase,
    private readonly linkToOrg: LinkSectorToOrganizationUseCase,
    private readonly unlinkFromOrg: UnlinkSectorFromOrganizationUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const { sectors } = (await this.getSectors.execute(user.id)).unwrap();
    return sectors.map((s) => ({ id: s.id.toString(), name: s.name, slug: s.slug, isActive: s.isActive }));
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getSectorById.execute(id, user.id);
    if (result.isLeft()) handleError(result);
    if (result.isRight()) {
      const s = result.value.sector;
      return { id: s.id.toString(), name: s.name, slug: s.slug, isActive: s.isActive, description: s.description };
    }
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: Record<string, unknown>, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createSector.execute({ ...body, name: body.name as string, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    if (result.isRight()) return { id: result.value.sector.id.toString() };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.updateSector.execute({ ...body, id, requesterId: user.id });
    if (result.isLeft()) handleError(result);
    if (result.isRight()) return { id: result.value.sector.id.toString() };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteSector.execute(id, user.id);
    if (result.isLeft()) handleError(result);
  }

  @Post("leads/:leadId/:sectorId")
  @HttpCode(204)
  async addToLead(@Param("leadId") leadId: string, @Param("sectorId") sectorId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.linkToLead.execute({ sectorId, entityId: leadId, requesterId: user.id });
    if (result.isLeft()) handleError(result);
  }

  @Delete("leads/:leadId/:sectorId")
  @HttpCode(204)
  async removeFromLead(@Param("leadId") leadId: string, @Param("sectorId") sectorId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.unlinkFromLead.execute({ sectorId, entityId: leadId, requesterId: user.id });
    if (result.isLeft()) handleError(result);
  }

  @Post("organizations/:orgId/:sectorId")
  @HttpCode(204)
  async addToOrg(@Param("orgId") orgId: string, @Param("sectorId") sectorId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.linkToOrg.execute({ sectorId, entityId: orgId, requesterId: user.id });
    if (result.isLeft()) handleError(result);
  }

  @Delete("organizations/:orgId/:sectorId")
  @HttpCode(204)
  async removeFromOrg(@Param("orgId") orgId: string, @Param("sectorId") sectorId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.unlinkFromOrg.execute({ sectorId, entityId: orgId, requesterId: user.id });
    if (result.isLeft()) handleError(result);
  }
}
