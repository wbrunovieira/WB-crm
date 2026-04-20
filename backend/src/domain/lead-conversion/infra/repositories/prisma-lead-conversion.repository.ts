import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  LeadConversionRepository,
  LeadWithContacts,
  ConversionPayload,
  ConversionResult,
} from "../../application/repositories/lead-conversion.repository";
import { Lead, LeadProps } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

@Injectable()
export class PrismaLeadConversionRepository extends LeadConversionRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findLeadWithContacts(leadId: string): Promise<LeadWithContacts | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await this.prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        leadContacts: true,
        leadLanguages: { select: { languageId: true } },
        leadFrameworks: { select: { frameworkId: true } },
        leadHosting: { select: { hostingId: true } },
        leadDatabases: { select: { databaseId: true } },
        leadERPs: { select: { erpId: true } },
        leadCRMs: { select: { crmId: true } },
        leadEcommerces: { select: { ecommerceId: true } },
        secondaryCNAEs: { select: { cnaeId: true } },
      },
    });
    if (!raw) return null;

    const lead = Lead.create(raw as unknown as LeadProps, new UniqueEntityID(raw.id));

    return {
      lead,
      contacts: raw.leadContacts.map((lc: Record<string, unknown>) => ({
        id: lc.id, leadId: lc.leadId, name: lc.name,
        role: lc.role ?? null, email: lc.email ?? null, phone: lc.phone ?? null,
        whatsapp: lc.whatsapp ?? null, linkedin: lc.linkedin ?? null,
        instagram: lc.instagram ?? null, isPrimary: lc.isPrimary,
        isActive: lc.isActive, languages: lc.languages ?? null,
      })),
      secondaryCNAEIds: raw.secondaryCNAEs.map((s: Record<string, unknown>) => s.cnaeId as string),
      techProfile: {
        languageIds: raw.leadLanguages.map((r: Record<string, unknown>) => r.languageId as string),
        frameworkIds: raw.leadFrameworks.map((r: Record<string, unknown>) => r.frameworkId as string),
        hostingIds: raw.leadHosting.map((r: Record<string, unknown>) => r.hostingId as string),
        databaseIds: raw.leadDatabases.map((r: Record<string, unknown>) => r.databaseId as string),
        erpIds: raw.leadERPs.map((r: Record<string, unknown>) => r.erpId as string),
        crmIds: raw.leadCRMs.map((r: Record<string, unknown>) => r.crmId as string),
        ecommerceIds: raw.leadEcommerces.map((r: Record<string, unknown>) => r.ecommerceId as string),
      },
    };
  }

  async execute(payload: ConversionPayload): Promise<ConversionResult> {
    const { lead, organization, contacts, secondaryCNAEIds, techProfile } = payload;
    const orgId = organization.id.toString();

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Organization
      await tx.organization.create({
        data: {
          id: orgId,
          ownerId: organization.ownerId,
          name: organization.name,
          legalName: organization.legalName ?? null,
          foundationDate: organization.foundationDate ?? null,
          website: organization.website ?? null,
          phone: organization.phone ?? null,
          whatsapp: organization.whatsapp ?? null,
          email: organization.email ?? null,
          country: organization.country ?? null,
          state: organization.state ?? null,
          city: organization.city ?? null,
          zipCode: organization.zipCode ?? null,
          streetAddress: organization.streetAddress ?? null,
          taxId: organization.taxId ?? null,
          description: organization.description ?? null,
          companyOwner: organization.companyOwner ?? null,
          companySize: organization.companySize ?? null,
          annualRevenue: organization.annualRevenue ?? null,
          instagram: organization.instagram ?? null,
          linkedin: organization.linkedin ?? null,
          facebook: organization.facebook ?? null,
          twitter: organization.twitter ?? null,
          tiktok: organization.tiktok ?? null,
          languages: organization.languages ?? null,
          primaryCNAEId: organization.primaryCNAEId ?? null,
          internationalActivity: organization.internationalActivity ?? null,
          referredByPartnerId: organization.referredByPartnerId ?? null,
          sourceLeadId: organization.sourceLeadId ?? null,
          hasHosting: false,
          hostingReminderDays: 30,
        },
      });

      // 2. Copy secondary CNAEs to Organization
      if (secondaryCNAEIds.length > 0) {
        await tx.organizationSecondaryCNAE.createMany({
          data: secondaryCNAEIds.map((cnaeId) => ({ organizationId: orgId, cnaeId })),
          skipDuplicates: true,
        });
      }

      // 3. Copy tech profile from Lead to Organization
      const tp = techProfile;
      const techOps: Promise<unknown>[] = [];
      if (tp.languageIds.length) techOps.push(tx.organizationLanguage.createMany({ data: tp.languageIds.map((id) => ({ organizationId: orgId, languageId: id })), skipDuplicates: true }));
      if (tp.frameworkIds.length) techOps.push(tx.organizationFramework.createMany({ data: tp.frameworkIds.map((id) => ({ organizationId: orgId, frameworkId: id })), skipDuplicates: true }));
      if (tp.hostingIds.length) techOps.push(tx.organizationHosting.createMany({ data: tp.hostingIds.map((id) => ({ organizationId: orgId, hostingId: id })), skipDuplicates: true }));
      if (tp.databaseIds.length) techOps.push(tx.organizationDatabase.createMany({ data: tp.databaseIds.map((id) => ({ organizationId: orgId, databaseId: id })), skipDuplicates: true }));
      if (tp.erpIds.length) techOps.push(tx.organizationERP.createMany({ data: tp.erpIds.map((id) => ({ organizationId: orgId, erpId: id })), skipDuplicates: true }));
      if (tp.crmIds.length) techOps.push(tx.organizationCRM.createMany({ data: tp.crmIds.map((id) => ({ organizationId: orgId, crmId: id })), skipDuplicates: true }));
      if (tp.ecommerceIds.length) techOps.push(tx.organizationEcommerce.createMany({ data: tp.ecommerceIds.map((id) => ({ organizationId: orgId, ecommerceId: id })), skipDuplicates: true }));
      await Promise.all(techOps);

      // 4. Create Contacts and link back to LeadContacts
      const contactIds: string[] = [];
      for (const { contact, sourceLeadContactId } of contacts) {
        const contactId = contact.id.toString();
        contactIds.push(contactId);

        await tx.contact.create({
          data: {
            id: contactId,
            ownerId: contact.ownerId,
            name: contact.name,
            email: contact.email ?? null,
            phone: contact.phone ?? null,
            whatsapp: contact.whatsapp ?? null,
            role: contact.role ?? null,
            linkedin: contact.linkedin ?? null,
            instagram: contact.instagram ?? null,
            organizationId: orgId,
            isPrimary: contact.isPrimary,
            status: contact.status,
            whatsappVerified: false,
            preferredLanguage: contact.preferredLanguage,
            languages: contact.languages ?? null,
            sourceLeadContactId: contact.sourceLeadContactId ?? null,
          },
        });

        await tx.leadContact.update({
          where: { id: sourceLeadContactId },
          data: { convertedToContactId: contactId },
        });
      }

      // 5. Update Lead: status = qualified + link to org
      await tx.lead.update({
        where: { id: lead.id.toString() },
        data: { status: "qualified", convertedToOrganizationId: orgId, updatedAt: new Date() },
      });

      return { organizationId: orgId, contactIds };
    });

    return result;
  }
}
