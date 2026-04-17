import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { ContactsRepository, type ContactsQueryParams } from "@/domain/contacts/application/repositories/contacts.repository";
import type { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { ContactMapper } from "../../mappers/contacts/contact.mapper";
import type { Prisma } from "@prisma/client";

@Injectable()
export class PrismaContactsRepository extends ContactsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany({ filters, requesterId, requesterRole }: ContactsQueryParams): Promise<Contact[]> {
    const where: Prisma.ContactWhereInput = {};

    // Owner scoping
    if (requesterRole !== "admin") {
      const shared = await this.prisma.sharedEntity.findMany({
        where: { entityType: "contact", sharedWithUserId: requesterId },
        select: { entityId: true },
      });
      const sharedIds = shared.map((s) => s.entityId);

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
      where.AND = where.AND ? [...(where.AND as any[]), { OR: or }] : [{ OR: or }];
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

    const rows = await this.prisma.contact.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { name: "asc" }],
    });

    return rows.map(ContactMapper.toDomain);
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
