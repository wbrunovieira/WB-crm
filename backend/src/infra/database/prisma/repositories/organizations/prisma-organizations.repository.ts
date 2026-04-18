import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { OrganizationsRepository } from "@/domain/organizations/application/repositories/organizations.repository";
import type { Organization } from "@/domain/organizations/enterprise/entities/organization";
import type { OrganizationSummary, OrganizationDetail } from "@/domain/organizations/enterprise/read-models/organization-read-models";
import { OrganizationMapper } from "../../mappers/organizations/organization.mapper";
import type { Prisma } from "@prisma/client";

@Injectable()
export class PrismaOrganizationsRepository extends OrganizationsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private buildWhereClause(
    requesterId: string,
    requesterRole: string,
    filters: { search?: string; owner?: string; hasHosting?: boolean } = {},
  ): Prisma.OrganizationWhereInput {
    const where: Prisma.OrganizationWhereInput = {};

    // Owner scoping
    if (requesterRole !== "admin") {
      where.ownerId = requesterId;
    } else if (filters.owner && filters.owner !== "all") {
      where.ownerId = filters.owner === "mine" ? requesterId : filters.owner;
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
            { name: { contains: filters.search, mode: "insensitive" } },
            { legalName: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
            { taxId: { contains: filters.search } },
          ],
        },
      ];
    }

    // hasHosting filter
    if (filters.hasHosting !== undefined) {
      where.hasHosting = filters.hasHosting;
    }

    return where;
  }

  async findMany(
    requesterId: string,
    requesterRole: string,
    filters: { search?: string; owner?: string; hasHosting?: boolean } = {},
  ): Promise<OrganizationSummary[]> {
    const where = this.buildWhereClause(requesterId, requesterRole, filters);

    const rows = await this.prisma.organization.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        labels: { select: { id: true, name: true, color: true } },
        primaryCNAE: { select: { id: true, code: true, description: true } },
        _count: { select: { contacts: true, deals: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      ownerId: row.ownerId,
      name: row.name,
      legalName: row.legalName,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      city: row.city,
      state: row.state,
      country: row.country,
      industry: row.industry,
      companySize: row.companySize,
      hasHosting: row.hasHosting,
      hostingRenewalDate: row.hostingRenewalDate,
      sourceLeadId: row.sourceLeadId,
      driveFolderId: row.driveFolderId,
      inOperationsAt: row.inOperationsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      owner: row.owner ? { id: row.owner.id, name: row.owner.name, email: row.owner.email } : null,
      primaryCNAE: row.primaryCNAE
        ? { id: row.primaryCNAE.id, code: row.primaryCNAE.code, description: row.primaryCNAE.description }
        : null,
      labels: row.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
      _count: { contacts: row._count.contacts, deals: row._count.deals },
    }));
  }

  async findById(id: string, requesterId: string, requesterRole: string): Promise<OrganizationDetail | null> {
    const row = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        labels: { select: { id: true, name: true, color: true } },
        primaryCNAE: { select: { id: true, code: true, description: true } },
        _count: { select: { contacts: true, deals: true } },
        contacts: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            whatsapp: true,
            role: true,
            isPrimary: true,
          },
        },
        deals: {
          select: {
            id: true,
            title: true,
            value: true,
            status: true,
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
        sectors: {
          include: {
            sector: { select: { id: true, name: true } },
          },
        },
        icps: {
          include: {
            icp: { select: { id: true, name: true } },
          },
        },
        organizationLanguages: { include: { language: { select: { name: true } } } },
        organizationFrameworks: { include: { framework: { select: { name: true } } } },
        organizationHosting: { include: { hosting: { select: { name: true } } } },
        organizationDatabases: { include: { database: { select: { name: true } } } },
        organizationERPs: { include: { erp: { select: { name: true } } } },
        organizationCRMs: { include: { crm: { select: { name: true } } } },
        organizationEcommerces: { include: { ecommerce: { select: { name: true } } } },
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
      name: row.name,
      legalName: row.legalName,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      city: row.city,
      state: row.state,
      country: row.country,
      industry: row.industry,
      companySize: row.companySize,
      hasHosting: row.hasHosting,
      hostingRenewalDate: row.hostingRenewalDate,
      sourceLeadId: row.sourceLeadId,
      driveFolderId: row.driveFolderId,
      inOperationsAt: row.inOperationsAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,

      // Summary relations
      owner: row.owner ? { id: row.owner.id, name: row.owner.name, email: row.owner.email } : null,
      primaryCNAE: row.primaryCNAE
        ? { id: row.primaryCNAE.id, code: row.primaryCNAE.code, description: row.primaryCNAE.description }
        : null,
      labels: row.labels.map((l) => ({ id: l.id, name: l.name, color: l.color })),
      _count: { contacts: row._count.contacts, deals: row._count.deals },

      // Detail scalar fields
      foundationDate: row.foundationDate,
      website: row.website,
      zipCode: row.zipCode,
      streetAddress: row.streetAddress,
      employeeCount: row.employeeCount,
      annualRevenue: row.annualRevenue,
      taxId: row.taxId,
      description: row.description,
      companyOwner: row.companyOwner,
      languages: row.languages,
      internationalActivity: row.internationalActivity,
      instagram: row.instagram,
      linkedin: row.linkedin,
      facebook: row.facebook,
      twitter: row.twitter,
      tiktok: row.tiktok,
      externalProjectIds: row.externalProjectIds,
      hostingPlan: row.hostingPlan,
      hostingValue: row.hostingValue,
      hostingReminderDays: row.hostingReminderDays,
      hostingNotes: row.hostingNotes,

      // Detail relations
      contacts: row.contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        phone: c.phone,
        whatsapp: c.whatsapp,
        role: c.role,
        isPrimary: c.isPrimary,
      })),
      deals: row.deals.map((d) => ({
        id: d.id,
        title: d.title,
        value: d.value,
        status: d.status,
        createdAt: d.createdAt,
      })),
      secondaryCNAEs: row.secondaryCNAEs.map((sc) => ({
        id: sc.cnae.id,
        code: sc.cnae.code,
        description: sc.cnae.description,
      })),
      sectors: row.sectors.map((os) => ({
        id: os.sector.id,
        name: os.sector.name,
      })),
      icps: row.icps.map((oi) => ({
        id: oi.icp.id,
        name: oi.icp.name,
      })),
      techProfile: {
        languages: row.organizationLanguages.map((ol) => ol.language.name),
        frameworks: row.organizationFrameworks.map((of) => of.framework.name),
        hosting: row.organizationHosting.map((oh) => oh.hosting.name),
        databases: row.organizationDatabases.map((od) => od.database.name),
        erps: row.organizationERPs.map((oe) => oe.erp.name),
        crms: row.organizationCRMs.map((oc) => oc.crm.name),
        ecommerces: row.organizationEcommerces.map((oe) => oe.ecommerce.name),
      },
    };
  }

  async findByIdRaw(id: string): Promise<Organization | null> {
    const raw = await this.prisma.organization.findUnique({ where: { id } });
    return raw ? OrganizationMapper.toDomain(raw) : null;
  }

  async save(organization: Organization): Promise<void> {
    const data = OrganizationMapper.toPrisma(organization);

    const { ...prismaData } = data as Record<string, unknown>;

    await this.prisma.organization.upsert({
      where: { id: prismaData["id"] as string },
      create: prismaData as Prisma.OrganizationUncheckedCreateInput,
      update: prismaData as Prisma.OrganizationUncheckedUpdateInput,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } });
  }
}
