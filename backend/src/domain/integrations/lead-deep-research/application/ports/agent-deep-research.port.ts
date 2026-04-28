export interface LeadDeepResearchPayload {
  leadId: string;
  requesterId: string;
  lead: {
    businessName: string;
    registeredName?: string | null;
    companyRegistrationID?: string | null;
    foundationDate?: string | null;
    companyOwner?: string | null;
    legalNature?: string | null;
    segment?: string | null;
    branchType?: string | null;
    simplesNacional?: boolean | null;
    isMei?: boolean | null;
    companySize?: string | null;
    employeesCount?: number | null;
    revenue?: number | null;
    revenueRange?: string | null;
    description?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zipCode?: string | null;
    phone?: string | null;
    phone2?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    instagram?: string | null;
    linkedin?: string | null;
    facebook?: string | null;
    twitter?: string | null;
    tiktok?: string | null;
    internationalActivity?: string | null;
    source?: string | null;
    quality?: string | null;
  };
  contacts: Array<{
    name: string;
    email?: string | null;
    phone?: string | null;
    role?: string | null;
  }>;
  previousSummary?: string;
  previousResearchAt?: string;
}

export interface LeadDeepResearchJobResponse {
  jobId: string;
  status: string;
}

export abstract class AgentDeepResearchPort {
  abstract request(payload: LeadDeepResearchPayload): Promise<LeadDeepResearchJobResponse>;
}
