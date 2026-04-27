import { LeadImportRepository } from "@/domain/lead-import/application/repositories/lead-import.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

export class InMemoryLeadImportRepository extends LeadImportRepository {
  leads: Lead[] = [];

  async findExistingByNames(businessNames: string[], ownerId: string): Promise<Map<string, string>> {
    const existing = new Map<string, string>();
    for (const lead of this.leads) {
      if (lead.ownerId === ownerId && businessNames.includes(lead.businessName.toLowerCase())) {
        existing.set(lead.businessName.toLowerCase(), lead.id.toString());
      }
    }
    return existing;
  }

  async findExistingByRegistrationIds(ids: string[], ownerId: string): Promise<Map<string, string>> {
    const existing = new Map<string, string>();
    for (const lead of this.leads) {
      if (lead.ownerId === ownerId && lead.companyRegistrationID && ids.includes(lead.companyRegistrationID)) {
        existing.set(lead.companyRegistrationID, lead.id.toString());
      }
    }
    return existing;
  }

  async batchCreate(leads: Lead[]): Promise<void> {
    this.leads.push(...leads);
  }
}
