import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  EnrollmentSourceRepository,
  LeadEnrollmentView,
  OrgEnrollmentView,
  EnrollmentCandidate,
} from "@/domain/email-campaigns/application/repositories/enrollment-source.repository";

function customVars(segment?: string | null, sourceGroup?: string | null): Record<string, string> | undefined {
  const v: Record<string, string> = {};
  if (segment) v.setor = segment;
  if (sourceGroup) v.sourceGroup = sourceGroup;
  return Object.keys(v).length > 0 ? v : undefined;
}

@Injectable()
export class PrismaEnrollmentSourceRepository extends EnrollmentSourceRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async findLeadEnrollment(leadId: string): Promise<LeadEnrollmentView | null> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
      select: {
        id: true,
        businessName: true,
        email: true,
        segment: true,
        sourceGroup: true,
        leadContacts: {
          where: { email: { not: null } },
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    if (!lead) return null;
    return {
      id: lead.id,
      businessName: lead.businessName ?? null,
      email: lead.email ?? null,
      segment: lead.segment ?? null,
      sourceGroup: lead.sourceGroup ?? null,
      contacts: lead.leadContacts.map((c) => ({
        id: c.id,
        name: c.name ?? null,
        email: c.email ?? null,
        role: c.role ?? null,
      })),
    };
  }

  async findOrgEnrollment(orgId: string): Promise<OrgEnrollmentView | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        segment: true,
        sourceGroup: true,
        contacts: {
          where: { email: { not: null } },
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    if (!org) return null;
    return {
      id: org.id,
      name: org.name ?? null,
      email: org.email ?? null,
      segment: org.segment ?? null,
      sourceGroup: org.sourceGroup ?? null,
      contacts: org.contacts.map((c) => ({
        id: c.id,
        name: c.name ?? null,
        email: c.email ?? null,
        role: c.role ?? null,
      })),
    };
  }

  async findBulkEnrollmentCandidates(ownerId: string, sourceGroup?: string): Promise<EnrollmentCandidate[]> {
    const ownerFilter = { ownerId };
    const sgFilter = sourceGroup ? { sourceGroup } : {};
    const out: EnrollmentCandidate[] = [];

    // 1. Leads (direct email)
    const leads = await this.prisma.lead.findMany({
      where: { email: { not: null }, ...ownerFilter, ...sgFilter },
      select: { id: true, businessName: true, email: true, segment: true, sourceGroup: true },
    });
    for (const lead of leads) {
      if (!lead.email) continue;
      out.push({
        dedupKey: `LEAD:${lead.id}`, recipientType: "LEAD", recipientId: lead.id, email: lead.email,
        name: lead.businessName ?? undefined, company: lead.businessName ?? undefined,
        customVars: customVars(lead.segment, lead.sourceGroup),
      });
    }

    // 2. LeadContacts
    const leadContacts = await this.prisma.leadContact.findMany({
      where: { email: { not: null }, lead: { ...ownerFilter, ...sgFilter } },
      select: { id: true, name: true, email: true, role: true, lead: { select: { businessName: true, segment: true, sourceGroup: true } } },
    });
    for (const lc of leadContacts) {
      if (!lc.email) continue;
      out.push({
        dedupKey: `LEAD_CONTACT:${lc.id}`, recipientType: "LEAD", recipientId: lc.id, email: lc.email,
        name: lc.name ?? undefined, company: lc.lead?.businessName ?? undefined, role: lc.role ?? undefined,
        customVars: customVars(lc.lead?.segment, lc.lead?.sourceGroup),
      });
    }

    // 3. Contacts linked to Organizations
    const orgContacts = await this.prisma.contact.findMany({
      where: { email: { not: null }, organizationId: { not: null }, organization: { ...ownerFilter, ...sgFilter } },
      select: { id: true, name: true, email: true, role: true, organization: { select: { name: true, segment: true, sourceGroup: true } } },
    });
    for (const c of orgContacts) {
      if (!c.email) continue;
      out.push({
        dedupKey: `CONTACT:${c.id}`, recipientType: "CONTACT", recipientId: c.id, email: c.email,
        name: c.name ?? undefined, company: c.organization?.name ?? undefined, role: c.role ?? undefined,
        customVars: customVars(c.organization?.segment, c.organization?.sourceGroup),
      });
    }

    // 4. Contacts linked directly to Leads
    const leadDirectContacts = await this.prisma.contact.findMany({
      where: { email: { not: null }, organizationId: null, leadId: { not: null }, lead: { ...ownerFilter, ...sgFilter } },
      select: { id: true, name: true, email: true, role: true, lead: { select: { businessName: true, segment: true, sourceGroup: true } } },
    });
    for (const c of leadDirectContacts) {
      if (!c.email) continue;
      out.push({
        dedupKey: `CONTACT:${c.id}`, recipientType: "CONTACT", recipientId: c.id, email: c.email,
        name: c.name ?? undefined, company: c.lead?.businessName ?? undefined, role: c.role ?? undefined,
        customVars: customVars(c.lead?.segment, c.lead?.sourceGroup),
      });
    }

    // 5. Organizations (company email)
    const orgs = await this.prisma.organization.findMany({
      where: { email: { not: null }, ...ownerFilter, ...sgFilter },
      select: { id: true, name: true, email: true, segment: true, sourceGroup: true },
    });
    for (const org of orgs) {
      if (!org.email) continue;
      out.push({
        dedupKey: `CONTACT:${org.id}`, recipientType: "CONTACT", recipientId: org.id, email: org.email,
        name: org.name ?? undefined, company: org.name ?? undefined,
        customVars: customVars(org.segment, org.sourceGroup),
      });
    }

    // 6. Contacts linked to Partners (no sourceGroup scoping — partners have none)
    const partnerContacts = await this.prisma.contact.findMany({
      where: { email: { not: null }, partnerId: { not: null }, ownerId },
      select: { id: true, name: true, email: true, role: true, partner: { select: { name: true } } },
    });
    for (const c of partnerContacts) {
      if (!c.email) continue;
      out.push({
        dedupKey: `CONTACT:${c.id}`, recipientType: "CONTACT", recipientId: c.id, email: c.email,
        name: c.name ?? undefined, company: c.partner?.name ?? undefined, role: c.role ?? undefined,
      });
    }

    // 7. Standalone Contacts (no lead/org/partner link)
    const standaloneContacts = await this.prisma.contact.findMany({
      where: { email: { not: null }, ownerId, organizationId: null, leadId: null, partnerId: null },
      select: { id: true, name: true, email: true, role: true },
    });
    for (const c of standaloneContacts) {
      if (!c.email) continue;
      out.push({
        dedupKey: `CONTACT:${c.id}`, recipientType: "CONTACT", recipientId: c.id, email: c.email,
        name: c.name ?? undefined, role: c.role ?? undefined,
      });
    }

    // 8. Partners (company email)
    const partners = await this.prisma.partner.findMany({
      where: { email: { not: null }, ownerId },
      select: { id: true, name: true, email: true },
    });
    for (const p of partners) {
      if (!p.email) continue;
      out.push({
        dedupKey: `CONTACT:${p.id}`, recipientType: "CONTACT", recipientId: p.id, email: p.email,
        name: p.name ?? undefined, company: p.name ?? undefined,
      });
    }

    return out;
  }
}
