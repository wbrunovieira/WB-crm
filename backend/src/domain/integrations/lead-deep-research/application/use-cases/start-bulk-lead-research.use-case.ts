import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { LeadContactsRepository } from "@/domain/leads/application/repositories/lead-contacts.repository";
import { AgentDeepResearchPort } from "../ports/agent-deep-research.port";
import { BulkResearchSessionRepository } from "../repositories/bulk-research-session.repository";

type Input = {
  leadIds: string[];
  requesterId: string;
  requesterRole: string;
  skipResearched: boolean;
};

type Output = Either<Error, { sessionId: string; total: number; skipped: number }>;

@Injectable()
export class StartBulkLeadResearchUseCase {
  constructor(
    private readonly leadsRepo: LeadsRepository,
    private readonly contactsRepo: LeadContactsRepository,
    private readonly agentPort: AgentDeepResearchPort,
    private readonly sessionRepo: BulkResearchSessionRepository,
  ) {}

  async execute({ leadIds, requesterId, requesterRole, skipResearched }: Input): Promise<Output> {
    let filteredIds = leadIds;

    if (skipResearched) {
      const checks = await Promise.all(
        leadIds.map((id) => this.leadsRepo.findByIdRaw(id)),
      );
      filteredIds = leadIds.filter((_, i) => !checks[i]?.agentResearchAt);
    }

    if (filteredIds.length === 0) {
      return left(new Error("Nenhum lead elegível para pesquisa"));
    }

    // Cancel any existing active session for this user
    await this.sessionRepo.cancelAllActiveForUser(requesterId);

    const session = await this.sessionRepo.create({
      userId: requesterId,
      leadIds: filteredIds,
      total: filteredIds.length,
    });

    // Trigger first lead
    await this.triggerLead(filteredIds[0], requesterId, requesterRole);

    return right({
      sessionId: session.id,
      total: filteredIds.length,
      skipped: leadIds.length - filteredIds.length,
    });
  }

  async triggerLead(leadId: string, requesterId: string, requesterRole: string): Promise<void> {
    const lead = await this.leadsRepo.findById(leadId, requesterId, requesterRole);
    if (!lead) return;

    const contacts = await this.contactsRepo.findByLead(leadId);

    await this.agentPort.request({
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
      contacts: contacts.map((c) => ({ name: c.name, email: c.email, phone: c.phone, role: c.role })),
      ...(lead.agentSummary && {
        previousSummary: lead.agentSummary,
        previousResearchAt: lead.agentResearchAt ? new Date(lead.agentResearchAt).toISOString() : undefined,
      }),
    });
  }
}
