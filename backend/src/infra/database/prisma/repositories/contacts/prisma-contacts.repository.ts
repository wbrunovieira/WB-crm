import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { ContactsRepository, type ContactsQueryParams } from "@/domain/contacts/application/repositories/contacts.repository";
import type { Contact } from "@/domain/contacts/enterprise/entities/contact";
import type { ContactSummary, ContactDetail } from "@/domain/contacts/enterprise/read-models/contact-read-models";
import { ContactMapper } from "../../mappers/contacts/contact.mapper";
import type { Prisma } from "@prisma/client";

@Injectable()
export class PrismaContactsRepository extends ContactsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private buildWhereClause(
    { filters, requesterId, requesterRole }: ContactsQueryParams,
    sharedIds: string[] = [],
  ): Prisma.ContactWhereInput {
    const where: Prisma.ContactWhereInput = {};

    // Owner scoping
    if (requesterRole !== "admin") {
      if (sharedIds.length > 0) {
        where.OR = [{ ownerId: requesterId }, { id: { in: sharedIds } }];
      } else {
        where.ownerId = requesterId;
      }
    } else if (filters.ownerIdFilter && filters.ownerIdFilter !== "all") {
      where.ownerId = filters.ownerIdFilter === "mine" ? requesterId : filters.ownerIdFilter;
    }

    // Search
    if (filters.search) {
      const or: Prisma.ContactWhereInput["OR"] = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search } },
      ];
      const existing = where.AND
        ? (Array.isArray(where.AND) ? where.AND : [where.AND])
        : [];
      where.AND = [...existing, { OR: or }];
    }

    // Status
    if (filters.status) where.status = filters.status;

    // Company type
    if (filters.company === "organization") where.organizationId = { not: null };
    else if (filters.company === "lead") where.leadId = { not: null };
    else if (filters.company === "partner") where.partnerId = { not: null };
    else if (filters.company === "none") {
      where.organizationId = null;
      where.leadId = null;
      where.partnerId = null;
    }

    return where;
  }

  async findMany({ filters, requesterId, requesterRole }: ContactsQueryParams): Promise<Contact[]> {
    const where = await this.buildWhereClauseWithShared({ filters, requesterId, requesterRole });

    const rows = await this.prisma.contact.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });

    return rows.map(ContactMapper.toDomain);
  }

  private async buildWhereClauseWithShared(params: ContactsQueryParams): Promise<Prisma.ContactWhereInput> {
    const { requesterId, requesterRole } = params;
    let sharedIds: string[] = [];

    if (requesterRole !== "admin") {
      const shared = await this.prisma.sharedEntity.findMany({
        where: { entityType: "contact", sharedWithUserId: requesterId },
        select: { entityId: true },
      });
      sharedIds = shared.map((s) => s.entityId);
    }

    return this.buildWhereClause(params, sharedIds);
  }

  async findManyWithRelations(params: ContactsQueryParams): Promise<ContactSummary[]> {
    const where = await this.buildWhereClauseWithShared(params);

    const rows = await this.prisma.contact.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
      include: {
        organization: { select: { id: true, name: true } },
        lead: { select: { id: true, businessName: true } },
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      role: row.role,
      department: row.department,
      isPrimary: row.isPrimary,
      status: row.status,
      organization: row.organization ? { id: row.organization.id, name: row.organization.name } : null,
      lead: row.lead ? { id: row.lead.id, businessName: row.lead.businessName } : null,
      partner: row.partner ? { id: row.partner.id, name: row.partner.name } : null,
      owner: row.owner ? { id: row.owner.id, name: row.owner.name } : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async findById(id: string): Promise<Contact | null> {
    const raw = await this.prisma.contact.findUnique({ where: { id } });
    return raw ? ContactMapper.toDomain(raw) : null;
  }

  async findByIdWithAccess(id: string, requesterId: string, requesterRole: string): Promise<Contact | null> {
    const raw = await this.prisma.contact.findUnique({ where: { id } });
    if (!raw) return null;
    if (requesterRole === "admin") return ContactMapper.toDomain(raw);
    if (raw.ownerId === requesterId) return ContactMapper.toDomain(raw);

    // Check shared access
    const shared = await this.prisma.sharedEntity.findFirst({
      where: { entityType: "contact", entityId: id, sharedWithUserId: requesterId },
    });
    return shared ? ContactMapper.toDomain(raw) : null;
  }

  async findByIdWithRelations(id: string, requesterId: string, requesterRole: string): Promise<ContactDetail | null> {
    const row = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        organization: { select: { id: true, name: true } },
        lead: { select: { id: true, businessName: true } },
        partner: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true, email: true } },
        deals: {
          include: {
            stage: { select: { name: true } },
          },
        },
        activities: {
          orderBy: { dueDate: "desc" },
          include: {
            whatsappMessages: {
              where: { mediaDriveId: { not: null } },
              select: {
                id: true,
                fromMe: true,
                pushName: true,
                timestamp: true,
                messageType: true,
                mediaDriveId: true,
                mediaMimeType: true,
                mediaLabel: true,
                mediaTranscriptText: true,
              },
              orderBy: { timestamp: "asc" },
            },
          },
        },
      },
    });

    if (!row) return null;

    // Access check
    if (requesterRole !== "admin" && row.ownerId !== requesterId) {
      const shared = await this.prisma.sharedEntity.findFirst({
        where: { entityType: "contact", entityId: id, sharedWithUserId: requesterId },
      });
      if (!shared) return null;
    }

    return {
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      whatsappVerified: row.whatsappVerified,
      whatsappVerifiedAt: row.whatsappVerifiedAt,
      whatsappVerifiedNumber: row.whatsappVerifiedNumber,
      role: row.role,
      department: row.department,
      isPrimary: row.isPrimary,
      status: row.status,
      linkedin: row.linkedin,
      instagram: row.instagram,
      birthDate: row.birthDate,
      notes: row.notes,
      preferredLanguage: row.preferredLanguage,
      languages: row.languages ?? null,
      source: row.source,
      leadId: row.leadId,
      organizationId: row.organizationId,
      partnerId: row.partnerId,
      organization: row.organization ? { id: row.organization.id, name: row.organization.name } : null,
      lead: row.lead ? { id: row.lead.id, businessName: row.lead.businessName } : null,
      partner: row.partner ? { id: row.partner.id, name: row.partner.name } : null,
      owner: row.owner ? { id: row.owner.id, name: row.owner.name, email: row.owner.email } : null,
      deals: row.deals.map((d) => ({
        id: d.id,
        title: d.title,
        stage: { name: d.stage?.name ?? "" },
      })),
      activities: row.activities.map((a) => ({
        id: a.id,
        type: a.type,
        subject: a.subject,
        description: a.description ?? null,
        dueDate: a.dueDate ?? null,
        completed: a.completed,
        completedAt: a.completedAt ?? null,
        createdAt: a.createdAt,
        contactId: a.contactId ?? null,
        leadId: a.leadId ?? null,
        dealId: a.dealId ?? null,
        partnerId: a.partnerId ?? null,
        whatsappMessages: a.whatsappMessages.map((m) => ({
          id: m.id,
          fromMe: m.fromMe,
          pushName: m.pushName ?? null,
          timestamp: m.timestamp,
          messageType: m.messageType,
          mediaDriveId: m.mediaDriveId ?? null,
          mediaMimeType: m.mediaMimeType ?? null,
          mediaLabel: m.mediaLabel ?? null,
          mediaTranscriptText: m.mediaTranscriptText ?? null,
        })),
      })),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async save(contact: Contact): Promise<void> {
    const data = ContactMapper.toPrisma(contact);
    await this.prisma.contact.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.contact.delete({ where: { id } });
  }
}
