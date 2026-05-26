import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { LeadImportRepository, ImportContactData } from "../../application/repositories/lead-import.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

@Injectable()
export class PrismaLeadImportRepository extends LeadImportRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findExistingByNames(businessNames: string[], ownerId: string): Promise<Map<string, string>> {
    if (businessNames.length === 0) return new Map();
    const rows = await this.prisma.lead.findMany({
      where: { ownerId, businessName: { in: businessNames, mode: "insensitive" } },
      select: { id: true, businessName: true },
    });
    return new Map(rows.map(r => [r.businessName.toLowerCase(), r.id]));
  }

  async findExistingByRegistrationIds(ids: string[], ownerId: string): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.lead.findMany({
      where: { ownerId, companyRegistrationID: { in: ids } },
      select: { id: true, companyRegistrationID: true },
    });
    return new Map(rows.filter(r => r.companyRegistrationID).map(r => [r.companyRegistrationID!, r.id]));
  }

  async findOrCreateCnaeByCode(code: string, description: string): Promise<string> {
    const record = await this.prisma.cNAE.upsert({
      where: { code },
      create: { code, description },
      update: {},
      select: { id: true },
    });
    return record.id;
  }

  async batchCreateContacts(contacts: ImportContactData[]): Promise<void> {
    if (contacts.length === 0) return;
    await this.prisma.leadContact.createMany({
      data: contacts.map(c => ({
        leadId: c.leadId,
        name: c.name,
        role: c.role ?? null,
        email: c.email ?? null,
        phone: c.phone ?? null,
        whatsapp: c.whatsapp ?? null,
        linkedin: c.linkedin ?? null,
        instagram: c.instagram ?? null,
        isPrimary: c.isPrimary,
      })),
      skipDuplicates: true,
    });
  }

  async batchCreateSecondaryCNAEs(items: Array<{ leadId: string; cnaeId: string }>): Promise<void> {
    if (items.length === 0) return;
    await this.prisma.leadSecondaryCNAE.createMany({
      data: items,
      skipDuplicates: true,
    });
  }

  async updateLeadCnaes(leadId: string, primaryCnaeId: string | undefined, secondaryCnaeIds: string[]): Promise<void> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { primaryCNAEId: primaryCnaeId ?? null },
    });
    if (secondaryCnaeIds.length > 0) {
      await this.prisma.leadSecondaryCNAE.deleteMany({ where: { leadId } });
      await this.prisma.leadSecondaryCNAE.createMany({
        data: secondaryCnaeIds.map(cnaeId => ({ leadId, cnaeId })),
        skipDuplicates: true,
      });
    }
  }

  async batchCreate(leads: Lead[]): Promise<void> {
    await this.prisma.lead.createMany({
      data: leads.map(lead => ({
        id: lead.id.toString(),
        businessName: lead.businessName,
        registeredName: lead.registeredName ?? null,
        companyRegistrationID: lead.companyRegistrationID ?? null,
        foundationDate: lead.foundationDate ?? null,
        businessStatus: lead.businessStatus ?? null,
        legalNature: lead.legalNature ?? null,
        branchType: lead.branchType ?? null,
        simplesNacional: lead.simplesNacional ?? null,
        isMei: lead.isMei ?? null,
        email: lead.email ?? null,
        phone: lead.phone ?? null,
        phone2: lead.phone2 ?? null,
        whatsapp: lead.whatsapp ?? null,
        website: lead.website ?? null,
        address: lead.address ?? null,
        vicinity: lead.vicinity ?? null,
        city: lead.city ?? null,
        state: lead.state ?? null,
        country: lead.country ?? null,
        zipCode: lead.zipCode ?? null,
        instagram: lead.instagram ?? null,
        linkedin: lead.linkedin ?? null,
        facebook: lead.facebook ?? null,
        twitter: lead.twitter ?? null,
        tiktok: lead.tiktok ?? null,
        companyOwner: lead.companyOwner ?? null,
        companySize: lead.companySize ?? null,
        revenue: lead.revenue ?? null,
        revenueRange: lead.revenueRange ?? null,
        equityCapital: lead.equityCapital ?? null,
        employeesCount: lead.employeesCount ?? null,
        description: lead.description ?? null,
        segment: lead.segment ?? null,
        source: lead.source ?? null,
        quality: lead.quality ?? null,
        searchTerm: lead.searchTerm ?? null,
        primaryCNAEId: lead.primaryCNAEId ?? null,
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
