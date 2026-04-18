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
import { GetContactsUseCase } from "@/domain/contacts/application/use-cases/get-contacts.use-case";
import { GetContactByIdUseCase } from "@/domain/contacts/application/use-cases/get-contact-by-id.use-case";
import { CreateContactUseCase, type CreateContactInput } from "@/domain/contacts/application/use-cases/create-contact.use-case";
import { UpdateContactUseCase, type UpdateContactInput } from "@/domain/contacts/application/use-cases/update-contact.use-case";
import { DeleteContactUseCase } from "@/domain/contacts/application/use-cases/delete-contact.use-case";
import { ToggleContactStatusUseCase } from "@/domain/contacts/application/use-cases/toggle-contact-status.use-case";
import type { Contact } from "@/domain/contacts/enterprise/entities/contact";

/* ─── DTOs ──────────────────────────────────────────────────────────────── */

class CreateContactDto {
  @ApiProperty({ example: "João Silva", description: "Nome completo do contato" })
  name!: string;

  @ApiPropertyOptional({ example: "joao@empresa.com" })
  email?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  phone?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  whatsapp?: string;

  @ApiPropertyOptional({ example: "CTO", description: "Cargo/função" })
  role?: string;

  @ApiPropertyOptional({ example: "Tecnologia" })
  department?: string;

  @ApiPropertyOptional({ example: "active", enum: ["active", "inactive"] })
  status?: string;

  @ApiPropertyOptional({ example: "lead_id_here" })
  leadId?: string;

  @ApiPropertyOptional({ example: "org_id_here" })
  organizationId?: string;

  @ApiPropertyOptional({ example: "partner_id_here" })
  partnerId?: string;

  @ApiPropertyOptional({ example: "https://linkedin.com/in/joao" })
  linkedin?: string;

  @ApiPropertyOptional({ example: "@joao" })
  instagram?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ example: "pt-BR" })
  preferredLanguage?: string;

  @ApiPropertyOptional({ example: ["pt-BR", "en"] })
  languages?: string[];

  @ApiPropertyOptional({ example: "linkedin" })
  source?: string;

  @ApiPropertyOptional()
  birthDate?: string;
}

class UpdateContactDto {
  @ApiPropertyOptional({ example: "João Silva Atualizado" })
  name?: string;

  @ApiPropertyOptional({ example: "joao@novaempresa.com" })
  email?: string;

  @ApiPropertyOptional({ example: "+5511888888888" })
  phone?: string;

  @ApiPropertyOptional({ example: "+5511888888888" })
  whatsapp?: string;

  @ApiPropertyOptional({ example: "CEO" })
  role?: string;

  @ApiPropertyOptional()
  department?: string;

  @ApiPropertyOptional({ example: "active", enum: ["active", "inactive"] })
  status?: string;

  @ApiPropertyOptional()
  linkedin?: string;

  @ApiPropertyOptional()
  instagram?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  preferredLanguage?: string;

  @ApiPropertyOptional()
  languages?: string[];
}

class ContactResponseDto {
  @ApiProperty({ example: "cuid_here" })
  id!: string;

  @ApiProperty({ example: "owner_id_here" })
  ownerId!: string;

  @ApiProperty({ example: "João Silva" })
  name!: string;

  @ApiPropertyOptional({ example: "joao@empresa.com" })
  email?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  phone?: string;

  @ApiPropertyOptional({ example: "+5511999999999" })
  whatsapp?: string;

  @ApiPropertyOptional({ example: false })
  whatsappVerified?: boolean;

  @ApiPropertyOptional({ example: "CTO" })
  role?: string;

  @ApiPropertyOptional({ example: "Tecnologia" })
  department?: string;

  @ApiPropertyOptional()
  leadId?: string;

  @ApiPropertyOptional()
  organizationId?: string;

  @ApiPropertyOptional()
  partnerId?: string;

  @ApiPropertyOptional()
  linkedin?: string;

  @ApiPropertyOptional()
  instagram?: string;

  @ApiProperty({ example: "active", enum: ["active", "inactive"] })
  status!: string;

  @ApiPropertyOptional({ example: false })
  isPrimary?: boolean;

  @ApiPropertyOptional()
  birthDate?: string;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional({ example: "pt-BR" })
  preferredLanguage?: string;

  @ApiPropertyOptional()
  languages?: string[];

  @ApiPropertyOptional()
  source?: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function handleError(err: Left<Error, unknown>): never {
  const msg = err.value.message;
  if (msg.includes("não encontrado")) throw new NotFoundException(msg);
  if (msg.includes("Não autorizado")) throw new UnauthorizedException(msg);
  throw new Error(msg);
}

function serialize(c: Contact) {
  return {
    id: c.id.toString(),
    ownerId: c.ownerId,
    name: c.name,
    email: c.email,
    phone: c.phone,
    whatsapp: c.whatsapp,
    whatsappVerified: c.whatsappVerified,
    role: c.role,
    department: c.department,
    leadId: c.leadId,
    organizationId: c.organizationId,
    partnerId: c.partnerId,
    linkedin: c.linkedin,
    instagram: c.instagram,
    status: c.status,
    isPrimary: c.isPrimary,
    birthDate: c.birthDate,
    notes: c.notes,
    preferredLanguage: c.preferredLanguage,
    languages: c.languages,
    source: c.source,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

/* ─── Controller ─────────────────────────────────────────────────────────── */

@ApiTags("Contacts")
@ApiBearerAuth("JWT")
@Controller("contacts")
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(
    private readonly getContacts: GetContactsUseCase,
    private readonly getContactById: GetContactByIdUseCase,
    private readonly createContact: CreateContactUseCase,
    private readonly updateContact: UpdateContactUseCase,
    private readonly deleteContact: DeleteContactUseCase,
    private readonly toggleStatus: ToggleContactStatusUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar contatos", description: "Retorna todos os contatos acessíveis pelo usuário autenticado (próprios + compartilhados). Admin vê todos." })
  @ApiQuery({ name: "search", required: false, description: "Busca por nome, email ou telefone" })
  @ApiQuery({ name: "status", required: false, enum: ["active", "inactive"], description: "Filtrar por status" })
  @ApiQuery({ name: "company", required: false, description: "Filtrar por empresa/organização" })
  @ApiQuery({ name: "owner", required: false, description: "Filtrar por dono (admin only: 'all', 'mine', ou userId)" })
  @ApiResponse({ status: 200, description: "Lista de contatos com relações (organization, lead, partner, owner)", type: [ContactResponseDto] })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async list(
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("company") company?: string,
    @Query("owner") owner?: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    const result = await this.getContacts.execute({
      requesterId: user!.id,
      requesterRole: user!.role ?? "sdr",
      filters: { search, status, company, ownerIdFilter: owner },
    });
    return result.unwrap().contacts;
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar contato por ID com relações completas" })
  @ApiParam({ name: "id", description: "ID do contato" })
  @ApiResponse({ status: 200, description: "Contato encontrado com deals, activities e relações", type: ContactResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Contato não encontrado" })
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getContactById.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return result.value.contact;
  }

  @Post()
  @ApiOperation({ summary: "Criar contato" })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, description: "Contato criado com sucesso", type: ContactResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  async create(@Body() body: Omit<CreateContactInput, "ownerId">, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createContact.execute({
      ...body,
      ownerId: user.id,
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.contact);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualizar contato" })
  @ApiParam({ name: "id", description: "ID do contato" })
  @ApiBody({ type: UpdateContactDto })
  @ApiResponse({ status: 200, description: "Contato atualizado", type: ContactResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Contato não encontrado" })
  async update(
    @Param("id") id: string,
    @Body() body: Omit<UpdateContactInput, "id" | "requesterId" | "requesterRole">,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.updateContact.execute({
      ...body,
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
      birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.contact);
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiOperation({ summary: "Deletar contato" })
  @ApiParam({ name: "id", description: "ID do contato" })
  @ApiResponse({ status: 204, description: "Contato deletado com sucesso" })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Contato não encontrado" })
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteContact.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
  }

  @Patch(":id/status")
  @HttpCode(200)
  @ApiOperation({ summary: "Alternar status do contato", description: "Alterna entre active e inactive" })
  @ApiParam({ name: "id", description: "ID do contato" })
  @ApiResponse({ status: 200, description: "Status atualizado", type: ContactResponseDto })
  @ApiResponse({ status: 401, description: "Token inválido ou ausente" })
  @ApiResponse({ status: 404, description: "Contato não encontrado" })
  async toggle(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.toggleStatus.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result);
    return serialize(result.value.contact);
  }
}
