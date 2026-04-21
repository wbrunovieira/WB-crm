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
import { GetOrganizationsUseCase } from "@/domain/organizations/application/use-cases/get-organizations.use-case";
import { GetOrganizationByIdUseCase } from "@/domain/organizations/application/use-cases/get-organization-by-id.use-case";
import { CreateOrganizationUseCase, type CreateOrganizationInput } from "@/domain/organizations/application/use-cases/create-organization.use-case";
import { UpdateOrganizationUseCase, type UpdateOrganizationInput } from "@/domain/organizations/application/use-cases/update-organization.use-case";
import { DeleteOrganizationUseCase } from "@/domain/organizations/application/use-cases/delete-organization.use-case";
import { LinkExternalProjectUseCase, UnlinkExternalProjectUseCase } from "@/domain/organizations/application/use-cases/link-external-project.use-case";
import type { Organization } from "@/domain/organizations/enterprise/entities/organization";

/* ─── DTOs ──────────────────────────────────────────────────────────────── */

class CreateOrganizationDto {
  @ApiProperty({ example: "Empresa XPTO", description: "Nome fantasia da organização" })
  name!: string;

  @ApiPropertyOptional({ example: "Empresa XPTO Comércio e Serviços Ltda" })
  legalName?: string;

  @ApiPropertyOptional({ example: "2015-03-20", description: "Data de fundação (YYYY-MM-DD)" })
  foundationDate?: string;

  @ApiPropertyOptional({ example: "https://empresa.com.br" })
  website?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  phone?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  whatsapp?: string;

  @ApiPropertyOptional({ example: "contato@empresa.com.br" })
  email?: string;

  @ApiPropertyOptional({ example: "Brasil" })
  country?: string;

  @ApiPropertyOptional({ example: "SP" })
  state?: string;

  @ApiPropertyOptional({ example: "São Paulo" })
  city?: string;

  @ApiPropertyOptional({ example: "01310-100" })
  zipCode?: string;

  @ApiPropertyOptional({ example: "Rua das Flores, 123" })
  streetAddress?: string;

  @ApiPropertyOptional({ example: "Tecnologia da Informação" })
  industry?: string;

  @ApiPropertyOptional({ example: 50 })
  employeeCount?: number;

  @ApiPropertyOptional({ example: 1500000 })
  annualRevenue?: number;

  @ApiPropertyOptional({ example: "12.345.678/0001-99" })
  taxId?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  companyOwner?: string;

  @ApiPropertyOptional({ example: "média" })
  companySize?: string;

  @ApiPropertyOptional({ description: "JSON string or array of language objects [{code, isPrimary}]" })
  languages?: string;

  @ApiPropertyOptional()
  primaryCNAEId?: string;

  @ApiPropertyOptional()
  internationalActivity?: string;

  @ApiPropertyOptional({ example: "@empresa" })
  instagram?: string;

  @ApiPropertyOptional({ example: "https://linkedin.com/company/empresa" })
  linkedin?: string;

  @ApiPropertyOptional()
  facebook?: string;

  @ApiPropertyOptional()
  twitter?: string;

  @ApiPropertyOptional()
  tiktok?: string;

  @ApiPropertyOptional()
  sourceLeadId?: string;

  @ApiPropertyOptional()
  referredByPartnerId?: string;

  @ApiPropertyOptional({ description: "JSON string array of external project IDs" })
  externalProjectIds?: string;

  @ApiPropertyOptional()
  driveFolderId?: string;

  @ApiPropertyOptional({ example: false })
  hasHosting?: boolean;

  @ApiPropertyOptional({ example: "2025-12-31", description: "Data de renovação do hosting (YYYY-MM-DD)" })
  hostingRenewalDate?: string;

  @ApiPropertyOptional({ example: "Profissional" })
  hostingPlan?: string;

  @ApiPropertyOptional({ example: 1200.0 })
  hostingValue?: number;

  @ApiPropertyOptional({ example: 30 })
  hostingReminderDays?: number;

  @ApiPropertyOptional()
  hostingNotes?: string;

  @ApiPropertyOptional()
  inOperationsAt?: string;

  @ApiPropertyOptional({ type: [String], description: "IDs das labels" })
  labelIds?: string[];
}

class UpdateOrganizationDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  legalName?: string;

  @ApiPropertyOptional()
  foundationDate?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  whatsapp?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  zipCode?: string;

  @ApiPropertyOptional()
  streetAddress?: string;

  @ApiPropertyOptional()
  industry?: string;

  @ApiPropertyOptional()
  employeeCount?: number;

  @ApiPropertyOptional()
  annualRevenue?: number;

  @ApiPropertyOptional()
  taxId?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  companyOwner?: string;

  @ApiPropertyOptional()
  companySize?: string;

  @ApiPropertyOptional()
  languages?: string;

  @ApiPropertyOptional()
  primaryCNAEId?: string;

  @ApiPropertyOptional()
  internationalActivity?: string;

  @ApiPropertyOptional()
  instagram?: string;

  @ApiPropertyOptional()
  linkedin?: string;

  @ApiPropertyOptional()
  facebook?: string;

  @ApiPropertyOptional()
  twitter?: string;

  @ApiPropertyOptional()
  tiktok?: string;

  @ApiPropertyOptional()
  sourceLeadId?: string;

  @ApiPropertyOptional()
  referredByPartnerId?: string;

  @ApiPropertyOptional()
  externalProjectIds?: string;

  @ApiPropertyOptional()
  driveFolderId?: string;

  @ApiPropertyOptional()
  hasHosting?: boolean;

  @ApiPropertyOptional()
  hostingRenewalDate?: string;

  @ApiPropertyOptional()
  hostingPlan?: string;

  @ApiPropertyOptional()
  hostingValue?: number;

  @ApiPropertyOptional()
  hostingReminderDays?: number;

  @ApiPropertyOptional()
  hostingNotes?: string;

  @ApiPropertyOptional()
  inOperationsAt?: string;

  @ApiPropertyOptional({ type: [String], description: "IDs das labels" })
  labelIds?: string[];
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrada")) throw new NotFoundException(msg);
  if (msg.includes("Não autorizado")) throw new UnauthorizedException(msg);
  throw new Error(msg);
}

function serialize(organization: Organization) {
  return {
    id: organization.id.toString(),
    ownerId: organization.ownerId,
    name: organization.name,
    legalName: organization.legalName,
    foundationDate: organization.foundationDate,
    website: organization.website,
    phone: organization.phone,
    whatsapp: organization.whatsapp,
    email: organization.email,
    country: organization.country,
    state: organization.state,
    city: organization.city,
    zipCode: organization.zipCode,
    streetAddress: organization.streetAddress,
    industry: organization.industry,
    employeeCount: organization.employeeCount,
    annualRevenue: organization.annualRevenue,
    taxId: organization.taxId,
    description: organization.description,
    companyOwner: organization.companyOwner,
    companySize: organization.companySize,
    languages: organization.languages,
    primaryCNAEId: organization.primaryCNAEId,
    internationalActivity: organization.internationalActivity,
    instagram: organization.instagram,
    linkedin: organization.linkedin,
    facebook: organization.facebook,
    twitter: organization.twitter,
    tiktok: organization.tiktok,
    sourceLeadId: organization.sourceLeadId,
    referredByPartnerId: organization.referredByPartnerId,
    externalProjectIds: organization.externalProjectIds,
    driveFolderId: organization.driveFolderId,
    hasHosting: organization.hasHosting,
    hostingRenewalDate: organization.hostingRenewalDate,
    hostingPlan: organization.hostingPlan,
    hostingValue: organization.hostingValue,
    hostingReminderDays: organization.hostingReminderDays,
    hostingNotes: organization.hostingNotes,
    inOperationsAt: organization.inOperationsAt,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Organizations")
@ApiBearerAuth("JWT")
@Controller("organizations")
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(
    private readonly getOrganizations: GetOrganizationsUseCase,
    private readonly getOrganizationById: GetOrganizationByIdUseCase,
    private readonly createOrganization: CreateOrganizationUseCase,
    private readonly updateOrganization: UpdateOrganizationUseCase,
    private readonly deleteOrganization: DeleteOrganizationUseCase,
    private readonly linkExternalProject: LinkExternalProjectUseCase,
    private readonly unlinkExternalProject: UnlinkExternalProjectUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar organizações", description: "Retorna todas as organizações acessíveis pelo usuário autenticado. Admin vê todos." })
  @ApiQuery({ name: "search", required: false, description: "Busca por nome, razão social, email, telefone ou CNPJ" })
  @ApiQuery({ name: "hasHosting", required: false, description: "Filtrar por hosting ativo (true/false)" })
  @ApiQuery({ name: "owner", required: false, description: "Filtrar por dono (admin only: 'all', 'mine', ou userId)" })
  @ApiResponse({ status: 200, description: "Lista de organizações com relações" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async list(
    @Query("search") search?: string,
    @Query("hasHosting") hasHostingStr?: string,
    @Query("owner") owner?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const hasHosting =
      hasHostingStr === "true" ? true : hasHostingStr === "false" ? false : undefined;

    const result = await this.getOrganizations.execute({
      requesterId: user!.id,
      requesterRole: user!.role ?? "sdr",
      filters: { search, hasHosting, owner },
    });
    return result.unwrap().organizations;
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar organização por ID com relações completas" })
  @ApiParam({ name: "id", description: "ID da organização" })
  @ApiResponse({ status: 200, description: "Organização encontrada com contatos, deals, perfil tech, CNAEs, setores e ICPs" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Organização não encontrada" })
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getOrganizationById.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value.organization;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Criar organização" })
  @ApiBody({ type: CreateOrganizationDto })
  @ApiResponse({ status: 201, description: "Organização criada com sucesso" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async create(@Body() body: Omit<CreateOrganizationInput, "ownerId">, @CurrentUser() user: AuthenticatedUser) {
    const { labelIds, ...rest } = body as any;
    const result = await this.createOrganization.execute({
      ...rest,
      ownerId: user.id,
      foundationDate: rest.foundationDate ? new Date(rest.foundationDate) : undefined,
      hostingRenewalDate: rest.hostingRenewalDate ? new Date(rest.hostingRenewalDate) : undefined,
      inOperationsAt: rest.inOperationsAt ? new Date(rest.inOperationsAt) : undefined,
      labelIds,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.organization);
  }

  @Patch(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar organização" })
  @ApiParam({ name: "id", description: "ID da organização" })
  @ApiBody({ type: UpdateOrganizationDto })
  @ApiResponse({ status: 200, description: "Organização atualizada" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Organização não encontrada" })
  async update(
    @Param("id") id: string,
    @Body() body: Omit<UpdateOrganizationInput, "id" | "requesterId" | "requesterRole">,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const { labelIds, ...rest } = body as any;
    const result = await this.updateOrganization.execute({
      ...rest,
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      foundationDate: rest.foundationDate ? new Date(rest.foundationDate) : undefined,
      hostingRenewalDate: rest.hostingRenewalDate ? new Date(rest.hostingRenewalDate) : undefined,
      inOperationsAt: rest.inOperationsAt ? new Date(rest.inOperationsAt) : undefined,
      labelIds,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.organization);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar organização" })
  @ApiParam({ name: "id", description: "ID da organização" })
  @ApiResponse({ status: 204, description: "Organização deletada com sucesso" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Organização não encontrada" })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteOrganization.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
  }

  @Post(":id/projects/:projectId")
  @HttpCode(200)
  @ApiOperation({ summary: "Vincular projeto externo à organização" })
  @ApiParam({ name: "id", description: "ID da organização" })
  @ApiParam({ name: "projectId", description: "ID do projeto externo" })
  @ApiResponse({ status: 200, description: "Lista de projectIds após vinculação" })
  @ApiResponse({ status: 404, description: "Organização não encontrada" })
  async linkProject(
    @Param("id") id: string,
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.linkExternalProject.execute({
      orgId: id,
      projectId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value;
  }

  @Delete(":id/projects/:projectId")
  @HttpCode(200)
  @ApiOperation({ summary: "Desvincular projeto externo da organização" })
  @ApiParam({ name: "id", description: "ID da organização" })
  @ApiParam({ name: "projectId", description: "ID do projeto externo" })
  @ApiResponse({ status: 200, description: "Lista de projectIds após desvinculação" })
  @ApiResponse({ status: 404, description: "Organização não encontrada" })
  async unlinkProject(
    @Param("id") id: string,
    @Param("projectId") projectId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.unlinkExternalProject.execute({
      orgId: id,
      projectId,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value;
  }
}
