import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { LeadsRepository, type LeadFilters, type LeadRelations } from "@/domain/leads/application/repositories/leads.repository";
import type { Lead } from "@/domain/leads/enterprise/entities/lead";
import type { LeadSummary, LeadDetail } from "@/domain/leads/enterprise/read-models/lead-read-models";
import { LeadMapper } from "../../mappers/leads/lead.mapper";
import type { Prisma } from "@prisma/client";

@Injectable()
export class PrismaLeadsRepository extends LeadsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private buildWhereClause(
    requesterId: string,
    requesterRole: string,
    filters: LeadFilters = {},
  ): Prisma.LeadWhereInput {
    const where: Prisma.LeadWhereInput = {};

    // Owner scoping
    if (requesterRole !== "admin") {
      where.ownerId = requesterId;
    } else if (filters.ownerIdFilter && filters.ownerIdFilter !== "all") {
      where.ownerId = filters.ownerIdFilter === "mine" ? requesterId : filters.ownerIdFilter;
    }

    // Search
    if (filters.search) {
      const existing = where.AND
        ? (Array.isArray(where.AND) ? where.AND : [where.AND])
        : [];
      where.AND = [
        ...existing,
        {
          OR: [
            { businessName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
            { whatsapp: { contains: filters.search } },
          ],
        },
      ];
    }

    // Status
    if (filters.status !== undefined) where.status = filters.status;

    // Quality
    if (filters.quality !== undefined) where.quality = filters.quality;

    // isArchived
    if (filters.isArchived !== undefined) where.isArchived = filters.isArchived;

    // isProspect
    if (filters.isProspect !== undefined) where.isProspect = filters.isProspect;

    return where;
  }

  async findMany(requesterId: string, requesterRole: string, filters: LeadFilters = {}): Promise<LeadSummary[]> {
    const where = this.buildWhereClause(requesterId, requesterRole, filters);

    const rows = await this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        referredByPartner: { select: { id: true, name: true } },
        labels: { select: { id: true, name: true, color: true } },
        primaryCNAE: { select: { id: true, code: true, description: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      businessName: row.businessName,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      status: row.status,
      quality: row.quality,
      isArchived: row.isArchived,
      isProspect: row.isProspect,
      city: row.city,
      state: row.state,
      country: row.country,
      starRating: row.starRating,
      fieldsFilled: row.fieldsFilled,
      convertedToOrganizationId: row.convertedToOrganizationId,
      convertedAt: row.convertedAt,
      referredByPartnerId: row.referredByPartnerId,
      driveFolderId: row.driveFolderId,
      inOperationsAt: row.inOperationsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: row.owner ? { id: row.owner.id, name: row.owner.name, email: row.owner.email } : null,
      referredByPartner: row.referredByPartner ? { id: row.referredByPartner.id, name: row.referredByPartner.name } : null,
      labels: row.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
      primaryCNAE: row.primaryCNAE ? { id: row.primaryCNAE.id, code: row.primaryCNAE.code, description: row.primaryCNAE.description } : null,
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<LeadDetail | null> {
    const row = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        referredByPartner: { select: { id: true, name: true } },
        labels: { select: { id: true, name: true, color: true } },
        primaryCNAE: { select: { id: true, code: true, description: true } },
        leadContacts: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            role: true,
            isPrimary: true,
            linkedin: true,
            instagram: true,
            convertedToContactId: true,
            languages: true,
          },
        },
        activities: {
          select: {
            id: true,
            type: true,
            subject: true,
            completed: true,
            dueDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        secondaryCNAEs: {
          include: {
            cnae: { select: { id: true, code: true, description: true } },
          },
        },
        leadLanguages: { include: { language: { select: { name: true } } } },
        leadFrameworks: { include: { framework: { select: { name: true } } } },
        leadHosting: { include: { hosting: { select: { name: true } } } },
        leadDatabases: { include: { database: { select: { name: true } } } },
        leadERPs: { include: { erp: { select: { name: true } } } },
        leadCRMs: { include: { crm: { select: { name: true } } } },
        leadEcommerces: { include: { ecommerce: { select: { name: true } } } },
      },
    });

    if (!row) return null;

    // Access check for non-admin
    if (requesterRole !== "admin" && row.ownerId !== requesterId) {
      return null;
    }

    return {
      id: row.id,
      ownerId: row.ownerId,
      businessName: row.businessName,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      status: row.status,
      quality: row.quality,
      isArchived: row.isArchived,
      isProspect: row.isProspect,
      city: row.city,
      state: row.state,
      country: row.country,
      starRating: row.starRating,
      fieldsFilled: row.fieldsFilled,
      convertedToOrganizationId: row.convertedToOrganizationId,
      convertedAt: row.convertedAt,
      referredByPartnerId: row.referredByPartnerId,
      driveFolderId: row.driveFolderId,
      inOperationsAt: row.inOperationsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,

      // LeadSummary relations
      owner: row.owner ? { id: row.owner.id, name: row.owner.name, email: row.owner.email } : null,
      referredByPartner: row.referredByPartner ? { id: row.referredByPartner.id, name: row.referredByPartner.name } : null,
      labels: row.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
      primaryCNAE: row.primaryCNAE ? { id: row.primaryCNAE.id, code: row.primaryCNAE.code, description: row.primaryCNAE.description } : null,

      // LeadDetail extra scalar fields
      registeredName: row.registeredName,
      foundationDate: row.foundationDate,
      companyRegistrationID: row.companyRegistrationID,
      address: row.address,
      zipCode: row.zipCode,
      vicinity: row.vicinity,
      whatsappVerified: row.whatsappVerified,
      whatsappVerifiedAt: row.whatsappVerifiedAt,
      whatsappVerifiedNumber: row.whatsappVerifiedNumber,
      website: row.website,
      instagram: row.instagram,
      linkedin: row.linkedin,
      facebook: row.facebook,
      twitter: row.twitter,
      tiktok: row.tiktok,
      googleId: row.googleId,
      categories: row.categories,
      rating: row.rating,
      priceLevel: row.priceLevel,
      userRatingsTotal: row.userRatingsTotal,
      permanentlyClosed: row.permanentlyClosed,
      types: row.types,
      companyOwner: row.companyOwner,
      companySize: row.companySize,
      revenue: row.revenue,
      employeesCount: row.employeesCount,
      description: row.description,
      equityCapital: row.equityCapital,
      businessStatus: row.businessStatus,
      languages: row.languages,
      primaryActivity: row.primaryActivity,
      secondaryActivities: row.secondaryActivities,
      internationalActivity: row.internationalActivity,
      source: row.source,
      searchTerm: row.searchTerm,
      category: row.category,
      radius: row.radius,
      socialMedia: row.socialMedia,
      metaAds: row.metaAds,
      googleAds: row.googleAds,
      latitude: row.latitude,
      longitude: row.longitude,
      googleMapsUrl: row.googleMapsUrl,
      openingHours: row.openingHours,
      googlePlacesSearchId: row.googlePlacesSearchId,
      archivedAt: row.archivedAt,
      archivedReason: row.archivedReason,
      activityOrder: row.activityOrder,

      // LeadDetail relations
      leadContacts: row.leadContacts.map((lc) => ({
        id: lc.id,
        name: lc.name,
        email: lc.email,
        phone: lc.phone,
        whatsapp: lc.whatsapp,
        role: lc.role,
        isPrimary: lc.isPrimary,
        linkedin: lc.linkedin,
        instagram: lc.instagram,
        convertedToContactId: lc.convertedToContactId,
        languages: lc.languages,
      })),
      activities: row.activities.map((a) => ({
        id: a.id,
        type: a.type,
        subject: a.subject,
        completed: a.completed,
        dueDate: a.dueDate,
        createdAt: a.createdAt,
      })),
      secondaryCNAEs: row.secondaryCNAEs.map((sc) => ({
        id: sc.cnae.id,
        code: sc.cnae.code,
        description: sc.cnae.description,
      })),
      techProfile: {
        languages: row.leadLanguages.map((ll) => ll.language.name),
        frameworks: row.leadFrameworks.map((lf) => lf.framework.name),
        hosting: row.leadHosting.map((lh) => lh.hosting.name),
        databases: row.leadDatabases.map((ld) => ld.database.name),
        erps: row.leadERPs.map((le) => le.erp.name),
        crms: row.leadCRMs.map((lc) => lc.crm.name),
        ecommerces: row.leadEcommerces.map((le) => le.ecommerce.name),
      },
    };
  }

  async findByIdRaw(id: string): Promise<Lead | null> {
    const raw = await this.prisma.lead.findUnique({ where: { id } });
    return raw ? LeadMapper.toDomain(raw) : null;
  }

  async save(lead: Lead): Promise<void> {
    const data = LeadMapper.toPrisma(lead);
    const { ...prismaData } = data as Record<string, unknown>;

    await this.prisma.lead.upsert({
      where: { id: prismaData["id"] as string },
      create: prismaData as Prisma.LeadUncheckedCreateInput,
      update: prismaData as Prisma.LeadUncheckedUpdateInput,
    });
  }

  async saveWithRelations(lead: Lead, relations: LeadRelations): Promise<void> {
    const data = LeadMapper.toPrisma(lead);
    const { ...prismaData } = data as Record<string, unknown>;
    const leadId = prismaData["id"] as string;

    await this.prisma.$transaction(async (tx) => {
      // 1. Upsert lead scalar fields
      await tx.lead.upsert({
        where: { id: leadId },
        create: prismaData as Prisma.LeadUncheckedCreateInput,
        update: prismaData as Prisma.LeadUncheckedUpdateInput,
      });

      // 2. Sync labels (replace all)
      if (relations.labelIds !== undefined) {
        await tx.lead.update({
          where: { id: leadId },
          data: { labels: { set: relations.labelIds.map((id) => ({ id })) } },
        });
      }

      // 3. Sync ICP (null = remove, string = replace)
      if (relations.icpId !== undefined) {
        await tx.leadICP.deleteMany({ where: { leadId } });
        if (relations.icpId !== null) {
          await tx.leadICP.create({ data: { leadId, icpId: relations.icpId } });
        }
      }

      // 4. Create contacts inline (only on new leads — skip if they already exist)
      if (relations.contacts && relations.contacts.length > 0) {
        const existing = await tx.leadContact.count({ where: { leadId } });
        if (existing === 0) {
          for (const c of relations.contacts) {
            await tx.leadContact.create({
              data: {
                leadId,
                name: c.name,
                email: c.email,
                phone: c.phone,
                whatsapp: c.whatsapp,
                linkedin: c.linkedin,
                instagram: c.instagram,
                role: c.role,
                isPrimary: c.isPrimary ?? false,
                languages: c.languages,
              },
            });
          }
        }
      }
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.lead.delete({ where: { id } });
  }
}
