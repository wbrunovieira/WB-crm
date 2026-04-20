import {
  LeadConversionRepository,
  LeadWithContacts,
  ConversionPayload,
  ConversionResult,
} from "@/domain/lead-conversion/application/repositories/lead-conversion.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

export class FakeLeadConversionRepository extends LeadConversionRepository {
  leadsWithContacts: Map<string, LeadWithContacts> = new Map();

  // Populated by execute()
  convertedLeads: Map<string, { organizationId: string; contactIds: string[] }> = new Map();

  seedLead(data: LeadWithContacts): void {
    this.leadsWithContacts.set(data.lead.id.toString(), data);
  }

  async findLeadWithContacts(leadId: string): Promise<LeadWithContacts | null> {
    return this.leadsWithContacts.get(leadId) ?? null;
  }

  async execute(payload: ConversionPayload): Promise<ConversionResult> {
    const organizationId = payload.organization.id.toString();
    const contactIds = payload.contacts.map((c) => c.contact.id.toString());

    this.convertedLeads.set(payload.lead.id.toString(), { organizationId, contactIds });

    return { organizationId, contactIds };
  }
}
