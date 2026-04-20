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
  GetICPsUseCase, GetICPByIdUseCase, CreateICPUseCase, UpdateICPUseCase, DeleteICPUseCase,
  GetLeadICPsUseCase, LinkLeadToICPUseCase, UpdateLeadICPUseCase, UnlinkLeadFromICPUseCase,
  GetOrganizationICPsUseCase, LinkOrganizationToICPUseCase, UpdateOrganizationICPUseCase, UnlinkOrganizationFromICPUseCase,
} from "../../application/use-cases/icp.use-cases";
import type { ICPLinkData } from "../../application/repositories/icp.repository";

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  if (msg.includes("Acesso negado")) throw new ForbiddenException(msg);
  throw new UnprocessableEntityException(msg);
}

@ApiTags("icps")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("icps")
export class ICPController {
  constructor(
    private readonly getICPs: GetICPsUseCase,
    private readonly getICPById: GetICPByIdUseCase,
    private readonly createICP: CreateICPUseCase,
    private readonly updateICP: UpdateICPUseCase,
    private readonly deleteICP: DeleteICPUseCase,
    private readonly getLeadICPs: GetLeadICPsUseCase,
    private readonly linkLeadToICP: LinkLeadToICPUseCase,
    private readonly updateLeadICP: UpdateLeadICPUseCase,
    private readonly unlinkLeadFromICP: UnlinkLeadFromICPUseCase,
    private readonly getOrgICPs: GetOrganizationICPsUseCase,
    private readonly linkOrgToICP: LinkOrganizationToICPUseCase,
    private readonly updateOrgICP: UpdateOrganizationICPUseCase,
    private readonly unlinkOrgFromICP: UnlinkOrganizationFromICPUseCase,
  ) {}

  @Get()
  async list(@CurrentUser() user: AuthenticatedUser) {
    const { icps } = (await this.getICPs.execute(user.id)).unwrap();
    return icps.map((i) => ({ id: i.id.toString(), name: i.name, slug: i.slug, status: i.statusValue }));
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getICPById.execute(id, user.id);
    if (result.isLeft()) handleError(result);
    const { icp } = result.unwrap();
    return { id: icp.id.toString(), name: icp.name, slug: icp.slug, content: icp.content, status: icp.statusValue };
  }

  @Post()
  @HttpCode(201)
  async create(@Body() body: Record<string, unknown>, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createICP.execute({ name: body.name as string, slug: body.slug as string | undefined, content: body.content as string, status: body.status as string | undefined, ownerId: user.id });
    if (result.isLeft()) handleError(result);
    const i = result.unwrap().icp;
    return { id: i.id.toString(), name: i.name, slug: i.slug, content: i.content, status: i.statusValue, createdAt: i.createdAt };
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.updateICP.execute({ ...body, id, requesterId: user.id });
    if (result.isLeft()) handleError(result);
    const i = result.unwrap().icp;
    return { id: i.id.toString(), name: i.name, slug: i.slug, content: i.content, status: i.statusValue, createdAt: i.createdAt };
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteICP.execute(id, user.id);
    if (result.isLeft()) handleError(result);
  }

  // ── Lead links ────────────────────────────────────────────────────────────
  @Get("leads/:leadId")
  async listLeadICPs(@Param("leadId") leadId: string) {
    const { links } = (await this.getLeadICPs.execute(leadId)).unwrap();
    return links;
  }

  @Post("leads/:leadId/:icpId")
  @HttpCode(204)
  async addToLead(@Param("leadId") leadId: string, @Param("icpId") icpId: string, @Body() body: ICPLinkData, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.linkLeadToICP.execute({ icpId, leadId, requesterId: user.id, ...body });
    if (result.isLeft()) handleError(result);
  }

  @Patch("leads/:leadId/:icpId")
  @HttpCode(204)
  async updateLeadLink(@Param("leadId") leadId: string, @Param("icpId") icpId: string, @Body() body: ICPLinkData, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.updateLeadICP.execute({ icpId, leadId, requesterId: user.id, ...body });
    if (result.isLeft()) handleError(result);
  }

  @Delete("leads/:leadId/:icpId")
  @HttpCode(204)
  async removeFromLead(@Param("leadId") leadId: string, @Param("icpId") icpId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.unlinkLeadFromICP.execute(icpId, leadId, user.id);
    if (result.isLeft()) handleError(result);
  }

  // ── Organization links ────────────────────────────────────────────────────
  @Get("organizations/:orgId")
  async listOrgICPs(@Param("orgId") orgId: string) {
    const { links } = (await this.getOrgICPs.execute(orgId)).unwrap();
    return links;
  }

  @Post("organizations/:orgId/:icpId")
  @HttpCode(204)
  async addToOrg(@Param("orgId") orgId: string, @Param("icpId") icpId: string, @Body() body: ICPLinkData, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.linkOrgToICP.execute({ icpId, organizationId: orgId, requesterId: user.id, ...body });
    if (result.isLeft()) handleError(result);
  }

  @Patch("organizations/:orgId/:icpId")
  @HttpCode(204)
  async updateOrgLink(@Param("orgId") orgId: string, @Param("icpId") icpId: string, @Body() body: ICPLinkData, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.updateOrgICP.execute({ icpId, organizationId: orgId, requesterId: user.id, ...body });
    if (result.isLeft()) handleError(result);
  }

  @Delete("organizations/:orgId/:icpId")
  @HttpCode(204)
  async removeFromOrg(@Param("orgId") orgId: string, @Param("icpId") icpId: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.unlinkOrgFromICP.execute(icpId, orgId, user.id);
    if (result.isLeft()) handleError(result);
  }
}
