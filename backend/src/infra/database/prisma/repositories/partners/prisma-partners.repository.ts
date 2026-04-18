import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { PartnersRepository, type PartnerFilters } from "@/domain/partners/application/repositories/partners.repository";
import type { Partner } from "@/domain/partners/enterprise/entities/partner";
import type { PartnerSummary, PartnerDetail } from "@/domain/partners/enterprise/read-models/partner-read-models";
import { PartnerMapper } from "../../mappers/partners/partner.mapper";

@Injectable()
export class PrismaPartnersRepository extends PartnersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findMany(requesterId: string, requesterRole: string, filters: PartnerFilters = {}): Promise<PartnerSummary[]> {
    const ownerFilter = requesterRole === "admin" && filters.owner === "all"
      ? {}
      : requesterRole === "admin" && filters.owner && filters.owner !== "mine"
        ? { ownerId: filters.owner }
        : { ownerId: requesterId };

    const rows = await this.prisma.partner.findMany({
      where: {
        ...ownerFilter,
        ...(filters.search && {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { partnerType: { contains: filters.search, mode: "insensitive" } },
            { expertise: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
          ],
        }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { contacts: true, activities: true, referredLeads: true } },
      },
      orderBy: [{ lastContactDate: "desc" }, { createdAt: "desc" }],
    });

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      legalName: row.legalName,
      partnerType: row.partnerType,
      email: row.email,
      phone: row.phone,
      city: row.city,
      state: row.state,
      country: row.country,
      industry: row.industry,
      expertise: row.expertise,
      companySize: row.companySize,
      lastContactDate: row.lastContactDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: row.owner,
      _count: row._count,
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<PartnerDetail | null> {
    const ownerFilter = requesterRole === "admin" ? {} : { ownerId: requesterId };

    const row = await this.prisma.partner.findFirst({
      where: { id, ...ownerFilter },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        _count: { select: { contacts: true, activities: true, referredLeads: true } },
        contacts: {
          select: { id: true, name: true, email: true, phone: true, whatsapp: true, role: true, isPrimary: true },
          orderBy: { name: "asc" },
        },
        activities: {
          select: { id: true, type: true, subject: true, completed: true, dueDate: true, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        referredLeads: {
          select: { id: true, businessName: true, status: true, convertedToOrganizationId: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!row) return null;

    const r = row as any;
    return {
      id: r.id,
      ownerId: r.ownerId,
      name: r.name,
      legalName: r.legalName,
      partnerType: r.partnerType,
      email: r.email,
      phone: r.phone,
      city: r.city,
      state: r.state,
      country: r.country,
      industry: r.industry,
      expertise: r.expertise,
      companySize: r.companySize,
      lastContactDate: r.lastContactDate,
      foundationDate: r.foundationDate,
      website: r.website,
      whatsapp: r.whatsapp,
      zipCode: r.zipCode,
      streetAddress: r.streetAddress,
      employeeCount: r.employeeCount,
      description: r.description,
      notes: r.notes,
      linkedin: r.linkedin,
      instagram: r.instagram,
      facebook: r.facebook,
      twitter: r.twitter,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      owner: r.owner,
      _count: r._count,
      contacts: r.contacts,
      activities: r.activities,
      referredLeads: r.referredLeads,
    };
  }

  async findByIdRaw(id: string): Promise<Partner | null> {
    const row = await this.prisma.partner.findUnique({ where: { id } });
    if (!row) return null;
    return PartnerMapper.toDomain(row);
  }

  async save(partner: Partner): Promise<void> {
    const data = PartnerMapper.toPrisma(partner);
    await this.prisma.partner.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.partner.delete({ where: { id } });
  }
}
