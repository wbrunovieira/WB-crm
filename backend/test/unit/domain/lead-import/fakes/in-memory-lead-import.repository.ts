import { LeadImportRepository } from "@/domain/lead-import/application/repositories/lead-import.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

export class InMemoryLeadImportRepository extends LeadImportRepository {
  leads: Lead[] = [];
  cnaes: Array<{ id: string; code: string; description: string }> = [];
  secondaryCnaes: Array<{ leadId: string; cnaeId: string }> = [];

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

  async findOrCreateCnaeByCode(code: string, description: string): Promise<string> {
    let existing = this.cnaes.find(c => c.code === code);
    if (!existing) {
      existing = { id: `cnae-${code}`, code, description };
      this.cnaes.push(existing);
    }
    return existing.id;
  }

  async batchCreateSecondaryCNAEs(items: Array<{ leadId: string; cnaeId: string }>): Promise<void> {
    this.secondaryCnaes.push(...items);
  }
}
