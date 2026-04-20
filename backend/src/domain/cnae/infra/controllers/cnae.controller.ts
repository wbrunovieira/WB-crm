import {
  Controller, Get, Post, Delete,
  Query, Param, HttpCode, UseGuards,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import {
  SearchCnaesUseCase,
  GetCnaeByIdUseCase,
  AddSecondaryCnaeToLeadUseCase,
  RemoveSecondaryCnaeFromLeadUseCase,
  AddSecondaryCnaeToOrganizationUseCase,
  RemoveSecondaryCnaeFromOrganizationUseCase,
} from "../../application/use-cases/cnae.use-cases";

function handleError(err: Left<Error, unknown>): never {
  throw new NotFoundException(err.value.message);
}

@ApiTags("cnaes")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("cnaes")
export class CnaeController {
  constructor(
    private readonly search: SearchCnaesUseCase,
    private readonly getById: GetCnaeByIdUseCase,
    private readonly addToLead: AddSecondaryCnaeToLeadUseCase,
    private readonly removeFromLead: RemoveSecondaryCnaeFromLeadUseCase,
    private readonly addToOrg: AddSecondaryCnaeToOrganizationUseCase,
    private readonly removeFromOrg: RemoveSecondaryCnaeFromOrganizationUseCase,
  ) {}

  @Get()
  async searchCnaes(@Query("q") q = "") {
    const result = await this.search.execute(q);
    return result.value.cnaes;
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const result = await this.getById.execute(id);
    if (result.isLeft()) handleError(result);
    if (result.isRight()) return result.value.cnae;
  }

  @Post("leads/:leadId/:cnaeId")
  @HttpCode(204)
  async addCnaeToLead(
    @Param("leadId") leadId: string,
    @Param("cnaeId") cnaeId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.addToLead.execute({ cnaeId, entityId: leadId });
    if (result.isLeft()) handleError(result);
  }

  @Delete("leads/:leadId/:cnaeId")
  @HttpCode(204)
  async removeCnaeFromLead(
    @Param("leadId") leadId: string,
    @Param("cnaeId") cnaeId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.removeFromLead.execute({ cnaeId, entityId: leadId });
    if (result.isLeft()) handleError(result);
  }

  @Post("organizations/:orgId/:cnaeId")
  @HttpCode(204)
  async addCnaeToOrg(
    @Param("orgId") orgId: string,
    @Param("cnaeId") cnaeId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.addToOrg.execute({ cnaeId, entityId: orgId });
    if (result.isLeft()) handleError(result);
  }

  @Delete("organizations/:orgId/:cnaeId")
  @HttpCode(204)
  async removeCnaeFromOrg(
    @Param("orgId") orgId: string,
    @Param("cnaeId") cnaeId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const result = await this.removeFromOrg.execute({ cnaeId, entityId: orgId });
    if (result.isLeft()) handleError(result);
  }
}
