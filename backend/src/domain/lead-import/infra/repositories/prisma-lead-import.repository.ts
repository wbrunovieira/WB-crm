import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { LeadImportRepository } from "../../application/repositories/lead-import.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

@Injectable()
export class PrismaLeadImportRepository extends LeadImportRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findExistingByNames(businessNames: string[], ownerId: string): Promise<Set<string>> {
    if (businessNames.length === 0) return new Set();
    const rows = await this.prisma.lead.findMany({
      where: { ownerId, businessName: { in: businessNames, mode: "insensitive" } },
      select: { businessName: true },
    });
    return new Set(rows.map(r => r.businessName.toLowerCase()));
  }

  async findExistingByRegistrationIds(ids: string[], ownerId: string): Promise<Set<string>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.lead.findMany({
      where: { ownerId, companyRegistrationID: { in: ids } },
      select: { companyRegistrationID: true },
    });
    return new Set(rows.map(r => r.companyRegistrationID).filter((id): id is string => !!id));
  }

  async batchCreate(leads: Lead[]): Promise<void> {
    await this.prisma.lead.createMany({
      data: leads.map(lead => ({
        id: lead.id.toString(),
        businessName: lead.businessName,
        registeredName: lead.registeredName ?? null,
        companyRegistrationID: lead.companyRegistrationID ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        whatsapp: lead.whatsapp ?? null,
        website: lead.website ?? null,
        address: lead.address ?? null,
        city: lead.city ?? null,
        state: lead.state ?? null,
        country: lead.country ?? null,
        zipCode: lead.zipCode ?? null,
        instagram: lead.instagram ?? null,
        linkedin: lead.linkedin ?? null,
        facebook: lead.facebook ?? null,
        description: lead.description ?? null,
        source: lead.source ?? null,
        quality: lead.quality ?? null,
        status: lead.status,
        ownerId: lead.ownerId,
        whatsappVerified: false,
        permanentlyClosed: false,
        isArchived: false,
        isProspect: false,
      })),
      skipDuplicates: true,
    });
  }
}
