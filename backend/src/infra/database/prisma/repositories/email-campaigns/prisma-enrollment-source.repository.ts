import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import {
  EnrollmentSourceRepository,
  LeadEnrollmentView,
  OrgEnrollmentView,
} from "@/domain/email-campaigns/application/repositories/enrollment-source.repository";

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
}
