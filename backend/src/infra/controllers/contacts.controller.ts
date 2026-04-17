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
import { JwtAuthGuard } from "@/infra/auth/guards/jwt-auth.guard";
import { CurrentUser } from "@/infra/auth/decorators/current-user.decorator";
import type { AuthenticatedUser } from "@/infra/auth/jwt.types";
import { GetContactsUseCase } from "@/domain/contacts/application/use-cases/get-contacts.use-case";
import { GetContactByIdUseCase } from "@/domain/contacts/application/use-cases/get-contact-by-id.use-case";
import { CreateContactUseCase, type CreateContactInput } from "@/domain/contacts/application/use-cases/create-contact.use-case";
import { UpdateContactUseCase, type UpdateContactInput } from "@/domain/contacts/application/use-cases/update-contact.use-case";
import { DeleteContactUseCase } from "@/domain/contacts/application/use-cases/delete-contact.use-case";
import { ToggleContactStatusUseCase } from "@/domain/contacts/application/use-cases/toggle-contact-status.use-case";
import type { Contact } from "@/domain/contacts/enterprise/entities/contact";

function handleError(result: { isLeft(): boolean; value: Error }): never {
  const msg = result.value.message;
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
    return (result as any).value.contacts.map(serialize);
  }

  @Get(":id")
  async get(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.getContactById.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result as any);
    return serialize((result as any).value.contact);
  }

  @Post()
  async create(@Body() body: Omit<CreateContactInput, "ownerId">, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.createContact.execute({ ...body, ownerId: user.id });
    if (result.isLeft()) handleError(result as any);
    return serialize((result as any).value.contact);
  }

  @Patch(":id")
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
    });
    if (result.isLeft()) handleError(result as any);
    return serialize((result as any).value.contact);
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.deleteContact.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result as any);
  }

  @Patch(":id/status")
  @HttpCode(200)
  async toggle(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.toggleStatus.execute({
      id,
      requesterId: user.id,
      requesterRole: user.role ?? "sdr",
    });
    if (result.isLeft()) handleError(result as any);
    return serialize((result as any).value.contact);
  }
}
