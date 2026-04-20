import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import { GetLeadsUseCase } from "@/domain/leads/application/use-cases/get-leads.use-case";
import { GetLeadByIdUseCase } from "@/domain/leads/application/use-cases/get-lead-by-id.use-case";
import { CreateLeadUseCase, type CreateLeadInput } from "@/domain/leads/application/use-cases/create-lead.use-case";
import { UpdateLeadUseCase, type UpdateLeadInput } from "@/domain/leads/application/use-cases/update-lead.use-case";
import { DeleteLeadUseCase } from "@/domain/leads/application/use-cases/delete-lead.use-case";
import { ArchiveLeadUseCase } from "@/domain/leads/application/use-cases/archive-lead.use-case";
import { UnarchiveLeadUseCase } from "@/domain/leads/application/use-cases/unarchive-lead.use-case";
import { QualifyLeadUseCase } from "@/domain/leads/application/use-cases/qualify-lead.use-case";
import { BulkArchiveLeadsUseCase } from "@/domain/leads/application/use-cases/bulk-archive-leads.use-case";
import {
  GetLeadContactsUseCase,
  CreateLeadContactUseCase,
  UpdateLeadContactUseCase,
  DeleteLeadContactUseCase,
  ToggleLeadContactActiveUseCase,
} from "@/domain/leads/application/use-cases/lead-contacts.use-cases";
import type { Lead } from "@/domain/leads/enterprise/entities/lead";

/* ─── DTOs ──────────────────────────────────────────────────────────────── */

class CreateLeadDto {
  @ApiProperty({ example: "Empresa XPTO Ltda", description: "Nome fantasia da empresa" })
  businessName!: string;

  @ApiPropertyOptional({ example: "Empresa XPTO Comércio e Serviços Ltda" })
  registeredName?: string;

  @ApiPropertyOptional({ example: "2020-01-15", description: "Data de fundação (YYYY-MM-DD)" })
  foundationDate?: string;

  @ApiPropertyOptional({ example: "12.345.678/0001-99" })
  companyRegistrationID?: string;

  @ApiPropertyOptional({ example: "Rua das Flores, 123" })
  address?: string;

  @ApiPropertyOptional({ example: "São Paulo" })
  city?: string;

  @ApiPropertyOptional({ example: "SP" })
  state?: string;

  @ApiPropertyOptional({ example: "Brasil" })
  country?: string;

  @ApiPropertyOptional({ example: "01310-100" })
  zipCode?: string;

  @ApiPropertyOptional()
  vicinity?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  phone?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  whatsapp?: string;

  @ApiPropertyOptional({ example: "https://empresa.com.br" })
  website?: string;

  @ApiPropertyOptional({ example: "contato@empresa.com.br" })
  email?: string;

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
  googleId?: string;

  @ApiPropertyOptional()
  categories?: string;

  @ApiPropertyOptional({ example: 4.5 })
  rating?: number;

  @ApiPropertyOptional()
  priceLevel?: number;

  @ApiPropertyOptional()
  userRatingsTotal?: number;

  @ApiPropertyOptional({ example: false })
  permanentlyClosed?: boolean;

  @ApiPropertyOptional()
  types?: string;

  @ApiPropertyOptional()
  companyOwner?: string;

  @ApiPropertyOptional({ example: "pequena" })
  companySize?: string;

  @ApiPropertyOptional()
  revenue?: number;

  @ApiPropertyOptional()
  employeesCount?: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  equityCapital?: number;

  @ApiPropertyOptional()
  businessStatus?: string;

  @ApiPropertyOptional({ description: "JSON string or array of language objects" })
  languages?: string;

  @ApiPropertyOptional({ example: "cold", enum: ["cold", "warm", "hot"] })
  quality?: string;

  @ApiPropertyOptional()
  searchTerm?: string;

  @ApiPropertyOptional()
  fieldsFilled?: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  radius?: number;

  @ApiPropertyOptional()
  socialMedia?: string;

  @ApiPropertyOptional()
  metaAds?: string;

  @ApiPropertyOptional()
  googleAds?: string;

  @ApiPropertyOptional({ example: 3 })
  starRating?: number;

  @ApiPropertyOptional()
  latitude?: number;

  @ApiPropertyOptional()
  longitude?: number;

  @ApiPropertyOptional()
  googleMapsUrl?: string;

  @ApiPropertyOptional({ description: "JSON string of opening hours array" })
  openingHours?: string;

  @ApiPropertyOptional()
  googlePlacesSearchId?: string;

  @ApiPropertyOptional({ example: "new", enum: ["new", "contacted", "qualified", "disqualified"] })
  status?: string;

  @ApiPropertyOptional({ example: false })
  isArchived?: boolean;

  @ApiPropertyOptional({ example: false })
  isProspect?: boolean;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  referredByPartnerId?: string;

  @ApiPropertyOptional()
  primaryCNAEId?: string;

  @ApiPropertyOptional()
  internationalActivity?: string;

  @ApiPropertyOptional()
  driveFolderId?: string;

  @ApiPropertyOptional()
  inOperationsAt?: string;

  // Relations
  @ApiPropertyOptional({ type: [String], description: "IDs dos labels a conectar" })
  labelIds?: string[];

  @ApiPropertyOptional({ description: "ID do ICP a vincular" })
  icpId?: string;

  @ApiPropertyOptional({ description: "Contatos inline a criar junto com o lead" })
  contacts?: Array<{
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
    linkedin?: string;
    instagram?: string;
    role?: string;
    isPrimary?: boolean;
    languages?: string;
  }>;
}

class UpdateLeadDto {
  @ApiPropertyOptional()
  businessName?: string;

  @ApiPropertyOptional()
  registeredName?: string;

  @ApiPropertyOptional()
  foundationDate?: string;

  @ApiPropertyOptional()
  companyRegistrationID?: string;

  @ApiPropertyOptional()
  address?: string;

  @ApiPropertyOptional()
  city?: string;

  @ApiPropertyOptional()
  state?: string;

  @ApiPropertyOptional()
  country?: string;

  @ApiPropertyOptional()
  zipCode?: string;

  @ApiPropertyOptional()
  vicinity?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  whatsapp?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  email?: string;

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
  companyOwner?: string;

  @ApiPropertyOptional()
  companySize?: string;

  @ApiPropertyOptional()
  revenue?: number;

  @ApiPropertyOptional()
  employeesCount?: number;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  equityCapital?: number;

  @ApiPropertyOptional()
  businessStatus?: string;

  @ApiPropertyOptional()
  languages?: string;

  @ApiPropertyOptional({ enum: ["cold", "warm", "hot"] })
  quality?: string;

  @ApiPropertyOptional()
  socialMedia?: string;

  @ApiPropertyOptional()
  metaAds?: string;

  @ApiPropertyOptional()
  googleAds?: string;

  @ApiPropertyOptional()
  starRating?: number;

  @ApiPropertyOptional({ enum: ["new", "contacted", "qualified", "disqualified"] })
  status?: string;

  @ApiPropertyOptional()
  isArchived?: boolean;

  @ApiPropertyOptional()
  isProspect?: boolean;

  @ApiPropertyOptional()
  source?: string;

  @ApiPropertyOptional()
  primaryCNAEId?: string;

  @ApiPropertyOptional()
  internationalActivity?: string;

  @ApiPropertyOptional()
  referredByPartnerId?: string;

  @ApiPropertyOptional()
  driveFolderId?: string;

  @ApiPropertyOptional()
  inOperationsAt?: string;

  @ApiPropertyOptional()
  activityOrder?: string;

  // Relations
  @ApiPropertyOptional({ type: [String], description: "IDs dos labels (substitui todos)" })
  labelIds?: string[];

  @ApiPropertyOptional({ nullable: true, description: "ID do ICP (null = remover)" })
  icpId?: string | null;
}

class ArchiveLeadDto {
  @ApiPropertyOptional({ example: "Sem potencial no momento", description: "Motivo do arquivamento" })
  reason?: string;
}

class BulkArchiveLeadsDto {
  @ApiProperty({ type: [String], description: "IDs dos leads a arquivar" })
  ids!: string[];

  @ApiPropertyOptional({ example: "Sem potencial no momento" })
  reason?: string;
}

class CreateLeadContactDto {
  @ApiProperty({ example: "Ana Silva" })
  name!: string;

  @ApiPropertyOptional({ example: "CEO" })
  role?: string;

  @ApiPropertyOptional({ example: "ana@empresa.com" })
  email?: string;

  @ApiPropertyOptional({ example: "+5511999990000" })
  phone?: string;

  @ApiPropertyOptional()
  whatsapp?: string;

  @ApiPropertyOptional()
  linkedin?: string;

  @ApiPropertyOptional()
  instagram?: string;

  @ApiPropertyOptional({ example: false })
  isPrimary?: boolean;

  @ApiPropertyOptional()
  languages?: string;
}

class UpdateLeadContactDto {
  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  role?: string;

  @ApiPropertyOptional()
  email?: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiPropertyOptional()
  whatsapp?: string;

  @ApiPropertyOptional()
  linkedin?: string;

  @ApiPropertyOptional()
  instagram?: string;

  @ApiPropertyOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  languages?: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  const name = (err.value as { name?: string }).name ?? "";
  if (msg.includes("não encontrado") || name.includes("NotFound")) throw new NotFoundException(msg);
  if (msg.includes("Acesso negado") || name.includes("Forbidden")) throw new ForbiddenException(msg);
  if (msg.includes("Não autorizado")) throw new UnauthorizedException(msg);
  throw new Error(msg);
}

function serialize(lead: Lead) {
  return {
    id: lead.id.toString(),
    ownerId: lead.ownerId,
    businessName: lead.businessName,
    registeredName: lead.registeredName,
    foundationDate: lead.foundationDate,
    companyRegistrationID: lead.companyRegistrationID,
    address: lead.address,
    city: lead.city,
    state: lead.state,
    country: lead.country,
    zipCode: lead.zipCode,
    vicinity: lead.vicinity,
    phone: lead.phone,
    whatsapp: lead.whatsapp,
    whatsappVerified: lead.whatsappVerified,
    whatsappVerifiedAt: lead.whatsappVerifiedAt,
    whatsappVerifiedNumber: lead.whatsappVerifiedNumber,
    website: lead.website,
    email: lead.email,
    instagram: lead.instagram,
    linkedin: lead.linkedin,
    facebook: lead.facebook,
    twitter: lead.twitter,
    tiktok: lead.tiktok,
    googleId: lead.googleId,
    categories: lead.categories,
    rating: lead.rating,
    priceLevel: lead.priceLevel,
    userRatingsTotal: lead.userRatingsTotal,
    permanentlyClosed: lead.permanentlyClosed,
    types: lead.types,
    companyOwner: lead.companyOwner,
    companySize: lead.companySize,
    revenue: lead.revenue,
    employeesCount: lead.employeesCount,
    description: lead.description,
    equityCapital: lead.equityCapital,
    businessStatus: lead.businessStatus,
    languages: lead.languages,
    primaryActivity: lead.primaryActivity,
    secondaryActivities: lead.secondaryActivities,
    primaryCNAEId: lead.primaryCNAEId,
    internationalActivity: lead.internationalActivity,
    source: lead.source,
    quality: lead.quality,
    searchTerm: lead.searchTerm,
    fieldsFilled: lead.fieldsFilled,
    category: lead.category,
    radius: lead.radius,
    socialMedia: lead.socialMedia,
    metaAds: lead.metaAds,
    googleAds: lead.googleAds,
    starRating: lead.starRating,
    latitude: lead.latitude,
    longitude: lead.longitude,
    googleMapsUrl: lead.googleMapsUrl,
    openingHours: lead.openingHours,
    googlePlacesSearchId: lead.googlePlacesSearchId,
    status: lead.status,
    isArchived: lead.isArchived,
    archivedAt: lead.archivedAt,
    archivedReason: lead.archivedReason,
    isProspect: lead.isProspect,
    convertedAt: lead.convertedAt,
    convertedToOrganizationId: lead.convertedToOrganizationId,
    referredByPartnerId: lead.referredByPartnerId,
    activityOrder: lead.activityOrder,
    driveFolderId: lead.driveFolderId,
    inOperationsAt: lead.inOperationsAt,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Leads")
@ApiBearerAuth("JWT")
@Controller("leads")
@UseGuards(JwtAuthGuard)
export class LeadsController {
  constructor(
    private readonly getLeads: GetLeadsUseCase,
    private readonly getLeadById: GetLeadByIdUseCase,
    private readonly createLead: CreateLeadUseCase,
    private readonly updateLead: UpdateLeadUseCase,
    private readonly deleteLead: DeleteLeadUseCase,
    private readonly archiveLead: ArchiveLeadUseCase,
    private readonly unarchiveLead: UnarchiveLeadUseCase,
    private readonly qualifyLead: QualifyLeadUseCase,
    private readonly bulkArchiveLeads: BulkArchiveLeadsUseCase,
    private readonly getLeadContacts: GetLeadContactsUseCase,
    private readonly createLeadContact: CreateLeadContactUseCase,
    private readonly updateLeadContact: UpdateLeadContactUseCase,
    private readonly deleteLeadContact: DeleteLeadContactUseCase,
    private readonly toggleLeadContact: ToggleLeadContactActiveUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar leads", description: "Retorna todos os leads acessíveis pelo usuário autenticado. Admin vê todos." })
  @ApiQuery({ name: "search", required: false, description: "Busca por nome, email ou telefone" })
  @ApiQuery({ name: "status", required: false, enum: ["new", "contacted", "qualified", "disqualified"], description: "Filtrar por status" })
  @ApiQuery({ name: "quality", required: false, enum: ["cold", "warm", "hot"], description: "Filtrar por qualidade" })
  @ApiQuery({ name: "isArchived", required: false, description: "Filtrar arquivados (true/false)" })
  @ApiQuery({ name: "isProspect", required: false, description: "Filtrar prospects (true/false)" })
  @ApiQuery({ name: "owner", required: false, description: "Filtrar por dono (admin only: 'all', 'mine', ou userId)" })
  @ApiResponse({ status: 200, description: "Lista de leads com relações" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async list(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("quality") quality?: string,
    @Query("isArchived") isArchivedStr?: string,
    @Query("isProspect") isProspectStr?: string,
    @Query("owner") owner?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const isArchived =
      isArchivedStr === "true" ? true : isArchivedStr === "false" ? false : undefined;
    const isProspect =
      isProspectStr === "true" ? true : isProspectStr === "false" ? false : undefined;

    const result = await this.getLeads.execute({
      requesterId: user!.id,
      requesterRole: user!.role ?? "sdr",
      filters: { search, status, quality, isArchived, isProspect, ownerIdFilter: owner },
    });
    return result.unwrap().leads;
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar lead por ID com relações completas" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiResponse({ status: 200, description: "Lead encontrado com contatos, atividades, perfil tech e CNAEs" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Lead não encontrado" })
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getLeadById.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value.lead;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Criar lead" })
  @ApiBody({ type: CreateLeadDto })
  @ApiResponse({ status: 201, description: "Lead criado com sucesso" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async create(@Body() body: CreateLeadDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createLead.execute({
      ...body,
      ownerId: user.id,
      foundationDate: body.foundationDate ? new Date(body.foundationDate) : undefined,
      inOperationsAt: body.inOperationsAt ? new Date(body.inOperationsAt) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.lead);
  }

  @Patch("bulk-archive")
  @HttpCode(200)
  @ApiOperation({ summary: "Arquivar múltiplos leads" })
  @ApiBody({ type: BulkArchiveLeadsDto })
  @ApiResponse({ status: 200, description: "Resultado do arquivamento em lote" })
  async bulkArchive(@Body() body: BulkArchiveLeadsDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.bulkArchiveLeads.execute({
      ids: body.ids,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      reason: body.reason,
    });
    return result.value;
  }

  @Patch(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiBody({ type: UpdateLeadDto })
  @ApiResponse({ status: 200, description: "Lead atualizado" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Lead não encontrado" })
  async update(
    @Param("id") id: string,
    @Body() body: UpdateLeadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateLead.execute({
      ...body,
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      foundationDate: body.foundationDate ? new Date(body.foundationDate) : undefined,
      inOperationsAt: body.inOperationsAt ? new Date(body.inOperationsAt) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.lead);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiResponse({ status: 204, description: "Lead deletado com sucesso" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Lead não encontrado" })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteLead.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
  }

  @Patch(":id/archive")
  @HttpCode(200)
  @ApiOperation({ summary: "Arquivar lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiBody({ type: ArchiveLeadDto, required: false })
  @ApiResponse({ status: 200, description: "Lead arquivado" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Lead não encontrado" })
  async archive(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.archiveLead.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      reason: body?.reason,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.lead);
  }

  @Patch(":id/unarchive")
  @HttpCode(200)
  @ApiOperation({ summary: "Desarquivar lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiResponse({ status: 200, description: "Lead desarquivado" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Lead não encontrado" })
  async unarchive(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.unarchiveLead.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.lead);
  }

  @Patch(":id/qualify")
  @HttpCode(200)
  @ApiOperation({ summary: "Qualificar lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiResponse({ status: 200, description: "Lead qualificado" })
  @ApiResponse({ status: 403, description: "Sem permissão" })
  @ApiResponse({ status: 404, description: "Lead não encontrado" })
  async qualify(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.qualifyLead.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
  }

  /* ─── Lead Contacts ──────────────────────────────────────────────────────── */

  @Get(":id/contacts")
  @ApiOperation({ summary: "Listar contatos do lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  async listContacts(@Param("id") id: string) {
    const result = await this.getLeadContacts.execute({ leadId: id });
    return result.value;
  }

  @Post(":id/contacts")
  @HttpCode(201)
  @ApiOperation({ summary: "Criar contato no lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiBody({ type: CreateLeadContactDto })
  async addContact(@Param("id") id: string, @Body() body: CreateLeadContactDto) {
    const result = await this.createLeadContact.execute({ leadId: id, ...body });
    if (result.isLeft()) throw new Error(result.value.message);
    return result.value;
  }

  @Patch(":id/contacts/:contactId")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar contato do lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiParam({ name: "contactId", description: "ID do contato" })
  @ApiBody({ type: UpdateLeadContactDto })
  async updateContact(
    @Param("contactId") contactId: string,
    @Body() body: UpdateLeadContactDto,
  ) {
    const result = await this.updateLeadContact.execute({ id: contactId, ...body });
    if (result.isLeft()) handleError(result);
    return result.value;
  }

  @Delete(":id/contacts/:contactId")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar contato do lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiParam({ name: "contactId", description: "ID do contato" })
  async removeContact(@Param("contactId") contactId: string) {
    const result = await this.deleteLeadContact.execute({ id: contactId });
    if (result.isLeft()) handleError(result);
  }

  @Patch(":id/contacts/:contactId/toggle")
  @HttpCode(200)
  @ApiOperation({ summary: "Ativar/desativar contato do lead" })
  @ApiParam({ name: "id", description: "ID do lead" })
  @ApiParam({ name: "contactId", description: "ID do contato" })
  async toggleContact(@Param("contactId") contactId: string) {
    const result = await this.toggleLeadContact.execute({ id: contactId });
    if (result.isLeft()) handleError(result);
    return result.value;
  }
}
