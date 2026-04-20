import {
  Controller, Get, Post, Delete,
  Param, HttpCode, UseGuards,
  NotFoundException, UnprocessableEntityException,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Left } from "@/core/either";
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import {
  GetTechProfileItemsUseCase, GetLeadTechProfileUseCase,
  AddLeadTechProfileItemUseCase, RemoveLeadTechProfileItemUseCase,
  GetOrganizationTechProfileUseCase, AddOrganizationTechProfileItemUseCase, RemoveOrganizationTechProfileItemUseCase,
} from "../../application/use-cases/tech-profile.use-cases";

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  throw new UnprocessableEntityException(msg);
}

@ApiTags("tech-profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class TechProfileController {
  constructor(
    private readonly getItems: GetTechProfileItemsUseCase,
    private readonly getLeadProfile: GetLeadTechProfileUseCase,
    private readonly addToLead: AddLeadTechProfileItemUseCase,
    private readonly removeFromLead: RemoveLeadTechProfileItemUseCase,
    private readonly getOrgProfile: GetOrganizationTechProfileUseCase,
    private readonly addToOrg: AddOrganizationTechProfileItemUseCase,
    private readonly removeFromOrg: RemoveOrganizationTechProfileItemUseCase,
  ) {}

  @Get("tech-profile/:type")
  async listItems(@Param("type") type: string) {
    const result = await this.getItems.execute(type);
    if (result.isLeft()) handleError(result);
    return result.unwrap().items;
  }

  @Get("leads/:leadId/tech-profile")
  async getLeadTechProfile(@Param("leadId") leadId: string) {
    const { profile } = (await this.getLeadProfile.execute(leadId)).unwrap();
    return profile;
  }

  @Post("leads/:leadId/tech-profile/:type/:itemId")
  @HttpCode(204)
  async addLeadItem(@Param("leadId") leadId: string, @Param("type") type: string, @Param("itemId") itemId: string) {
    const result = await this.addToLead.execute(leadId, type, itemId);
    if (result.isLeft()) handleError(result);
  }

  @Delete("leads/:leadId/tech-profile/:type/:itemId")
  @HttpCode(204)
  async removeLeadItem(@Param("leadId") leadId: string, @Param("type") type: string, @Param("itemId") itemId: string) {
    const result = await this.removeFromLead.execute(leadId, type, itemId);
    if (result.isLeft()) handleError(result);
  }

  @Get("organizations/:orgId/tech-profile")
  async getOrgTechProfile(@Param("orgId") orgId: string) {
    const { profile } = (await this.getOrgProfile.execute(orgId)).unwrap();
    return profile;
  }

  @Post("organizations/:orgId/tech-profile/:type/:itemId")
  @HttpCode(204)
  async addOrgItem(@Param("orgId") orgId: string, @Param("type") type: string, @Param("itemId") itemId: string) {
    const result = await this.addToOrg.execute(orgId, type, itemId);
    if (result.isLeft()) handleError(result);
  }

  @Delete("organizations/:orgId/tech-profile/:type/:itemId")
  @HttpCode(204)
  async removeOrgItem(@Param("orgId") orgId: string, @Param("type") type: string, @Param("itemId") itemId: string) {
    const result = await this.removeFromOrg.execute(orgId, type, itemId);
    if (result.isLeft()) handleError(result);
  }
}
