import { LeadDuplicatesRepository, DuplicateCheckInput, DuplicateMatch } from "@/domain/lead-duplicates/application/repositories/lead-duplicates.repository";

interface SeedLead {
  id: string;
  businessName: string;
  ownerId: string;
  cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export class FakeLeadDuplicatesRepository extends LeadDuplicatesRepository {
  leads: SeedLead[] = [];

  async findDuplicates(input: DuplicateCheckInput): Promise<DuplicateMatch[]> {
    const results: DuplicateMatch[] = [];

    for (const lead of this.leads) {
      if (lead.ownerId !== input.ownerId) continue;
      const matched: string[] = [];

      if (input.cnpj && lead.cnpj && lead.cnpj === input.cnpj) matched.push("cnpj");
      if (input.phone && lead.phone && lead.phone === input.phone) matched.push("phone");
      if (input.email && lead.email && lead.email.toLowerCase() === input.email.toLowerCase()) matched.push("email");
      if (input.name && lead.businessName.toLowerCase().includes(input.name.toLowerCase())) matched.push("name");
      if (input.address && lead.address && lead.address.toLowerCase().includes(input.address.toLowerCase())) matched.push("address");

      if (matched.length > 0) {
        results.push({
          leadId: lead.id,
          businessName: lead.businessName,
          companyRegistrationID: lead.cnpj ?? null,
          phone: lead.phone ?? null,
          email: lead.email ?? null,
          city: null,
          state: null,
          isArchived: false,
          status: "new",
          matchedFields: matched,
          score: matched.length * 25,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }
}
