import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { AgentDeepResearchPort } from "../ports/agent-deep-research.port";

type Input = {
  leadId: string;
  requesterId: string;
  requesterRole: string;
};

type Output = Either<Error, { jobId: string }>;

@Injectable()
export class RequestLeadDeepResearchUseCase {
  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly contactsRepo: LeadContactsRepository,
    private readonly agentPort: AgentDeepResearchPort,
  ) {}

  async execute({ leadId, requesterId, requesterRole }: Input): Promise<Output> {
    const lead = await this.leadsRepo.findById(leadId, requesterId, requesterRole);
    if (!lead) return left(new Error("Lead não encontrado"));

    const contacts = await this.contactsRepo.findByLead(leadId);

    const result = await this.agentPort.request({
      leadId,
      requesterId,
      lead: {
        businessName: lead.businessName,
        registeredName: lead.registeredName,
        companyRegistrationID: lead.companyRegistrationID,
        foundationDate: lead.foundationDate ? new Date(lead.foundationDate).toISOString() : null,
        companyOwner: lead.companyOwner,
        legalNature: lead.legalNature,
        segment: lead.segment,
        branchType: lead.branchType,
        simplesNacional: lead.simplesNacional,
        isMei: lead.isMei,
        companySize: lead.companySize,
        employeesCount: lead.employeesCount,
        revenue: lead.revenue,
        revenueRange: lead.revenueRange,
        description: lead.description,
        address: lead.address,
        city: lead.city,
        state: lead.state,
        country: lead.country,
        zipCode: lead.zipCode,
        phone: lead.phone,
        phone2: lead.phone2,
        whatsapp: lead.whatsapp,
        email: lead.email,
        website: lead.website,
        instagram: lead.instagram,
        linkedin: lead.linkedin,
        facebook: lead.facebook,
        twitter: lead.twitter,
        tiktok: lead.tiktok,
        internationalActivity: lead.internationalActivity,
        source: lead.source,
        quality: lead.quality,
      },
      contacts: contacts.map((c) => ({
        name: c.name,
        email: c.email,
        phone: c.phone,
        role: c.role,
      })),
    });

    return right({ jobId: result.jobId });
  }
}
