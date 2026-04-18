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
import { GetPartnersUseCase } from "@/domain/partners/application/use-cases/get-partners.use-case";
import { GetPartnerByIdUseCase } from "@/domain/partners/application/use-cases/get-partner-by-id.use-case";
import { CreatePartnerUseCase, type CreatePartnerInput } from "@/domain/partners/application/use-cases/create-partner.use-case";
import { UpdatePartnerUseCase, type UpdatePartnerInput } from "@/domain/partners/application/use-cases/update-partner.use-case";
import { DeletePartnerUseCase } from "@/domain/partners/application/use-cases/delete-partner.use-case";
import { UpdatePartnerLastContactUseCase } from "@/domain/partners/application/use-cases/update-partner-last-contact.use-case";
import type { Partner } from "@/domain/partners/enterprise/entities/partner";

/* ─── DTOs ──────────────────────────────────────────────────────────────── */

class CreatePartnerDto {
  @ApiProperty({ example: "Agência Digital XYZ" })
  name!: string;

  @ApiProperty({ example: "agencia_digital", description: "Tipo: agencia_digital, consultoria, universidade, fornecedor, indicador, investidor, mentor, parceiro_tecnologico, associacao, midia, outros" })
  partnerType!: string;

  @ApiPropertyOptional({ example: "Agência Digital XYZ Ltda" })
  legalName?: string;

  @ApiPropertyOptional({ example: "2018-05-10", description: "Data de fundação (YYYY-MM-DD)" })
  foundationDate?: string;

  @ApiPropertyOptional({ example: "https://agencia.com.br" })
  website?: string;

  @ApiPropertyOptional({ example: "contato@agencia.com.br" })
  email?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  phone?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  whatsapp?: string;

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

  @ApiPropertyOptional({ example: "https://linkedin.com/company/agencia" })
  linkedin?: string;

  @ApiPropertyOptional({ example: "@agencia" })
  instagram?: string;

  @ApiPropertyOptional()
  facebook?: string;

  @ApiPropertyOptional()
  twitter?: string;

  @ApiPropertyOptional({ example: "Marketing Digital" })
  industry?: string;

  @ApiPropertyOptional({ example: 15 })
  employeeCount?: number;

  @ApiPropertyOptional({ example: "pequena" })
  companySize?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional({ example: "SEO, Google Ads, Meta Ads" })
  expertise?: string;

  @ApiPropertyOptional()
  notes?: string;
}

class UpdatePartnerDto {
  @ApiPropertyOptional() name?: string;
  @ApiPropertyOptional() partnerType?: string;
  @ApiPropertyOptional() legalName?: string;
  @ApiPropertyOptional() foundationDate?: string;
  @ApiPropertyOptional() website?: string;
  @ApiPropertyOptional() email?: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() whatsapp?: string;
  @ApiPropertyOptional() country?: string;
  @ApiPropertyOptional() state?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() zipCode?: string;
  @ApiPropertyOptional() streetAddress?: string;
  @ApiPropertyOptional() linkedin?: string;
  @ApiPropertyOptional() instagram?: string;
  @ApiPropertyOptional() facebook?: string;
  @ApiPropertyOptional() twitter?: string;
  @ApiPropertyOptional() industry?: string;
  @ApiPropertyOptional() employeeCount?: number;
  @ApiPropertyOptional() companySize?: string;
  @ApiPropertyOptional() description?: string;
  @ApiPropertyOptional() expertise?: string;
  @ApiPropertyOptional() notes?: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  if (msg.includes("Não autorizado")) throw new UnauthorizedException(msg);
  throw new Error(msg);
}

function serialize(partner: Partner) {
  return {
    id: partner.id.toString(),
    ownerId: partner.ownerId,
    name: partner.name,
    legalName: partner.legalName,
    foundationDate: partner.foundationDate,
    partnerType: partner.partnerType,
    website: partner.website,
    email: partner.email,
    phone: partner.phone,
    whatsapp: partner.whatsapp,
    country: partner.country,
    state: partner.state,
    city: partner.city,
    zipCode: partner.zipCode,
    streetAddress: partner.streetAddress,
    linkedin: partner.linkedin,
    instagram: partner.instagram,
    facebook: partner.facebook,
    twitter: partner.twitter,
    industry: partner.industry,
    employeeCount: partner.employeeCount,
    companySize: partner.companySize,
    description: partner.description,
    expertise: partner.expertise,
    notes: partner.notes,
    lastContactDate: partner.lastContactDate,
    createdAt: partner.createdAt,
    updatedAt: partner.updatedAt,
  };
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Partners")
@ApiBearerAuth("JWT")
@Controller("partners")
@UseGuards(JwtAuthGuard)
export class PartnersController {
  constructor(
    private readonly getPartners: GetPartnersUseCase,
    private readonly getPartnerById: GetPartnerByIdUseCase,
    private readonly createPartner: CreatePartnerUseCase,
    private readonly updatePartner: UpdatePartnerUseCase,
    private readonly deletePartner: DeletePartnerUseCase,
    private readonly updateLastContact: UpdatePartnerLastContactUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar parceiros" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "owner", required: false, description: "Admin: 'all', 'mine' ou userId" })
  @ApiResponse({ status: 200, description: "Lista de parceiros" })
  async list(
    @Query("search") search?: string,
    @Query("owner") owner?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.getPartners.execute({
      requesterId: user!.id,
      requesterRole: user!.role ?? "sdr",
      filters: { search, owner },
    });
    return result.unwrap().partners;
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar parceiro por ID com relações completas" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getPartnerById.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value.partner;
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: "Criar parceiro" })
  @ApiBody({ type: CreatePartnerDto })
  @ApiResponse({ status: 201 })
  async create(@Body() body: Omit<CreatePartnerInput, "ownerId">, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createPartner.execute({
      ...body,
      ownerId: user.id,
      foundationDate: (body as any).foundationDate ? new Date((body as any).foundationDate) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.partner);
  }

  @Patch(":id")
  @HttpCode(200)
  @ApiOperation({ summary: "Atualizar parceiro" })
  @ApiParam({ name: "id" })
  @ApiBody({ type: UpdatePartnerDto })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async update(
    @Param("id") id: string,
    @Body() body: Omit<UpdatePartnerInput, "id" | "requesterId" | "requesterRole">,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updatePartner.execute({
      ...body,
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      foundationDate: (body as any).foundationDate ? new Date((body as any).foundationDate) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.partner);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar parceiro" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 404 })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deletePartner.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
  }

  @Patch(":id/last-contact")
  @HttpCode(200)
  @ApiOperation({ summary: "Registrar último contato com o parceiro (atualiza lastContactDate)" })
  @ApiParam({ name: "id" })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async touchLastContact(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.updateLastContact.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.partner);
  }
}
