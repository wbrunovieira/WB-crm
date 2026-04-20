import type { Lead } from "@/domain/leads/enterprise/entities/lead";
import type { Organization } from "@/domain/organizations/enterprise/entities/organization";
import type { Contact } from "@/domain/contacts/enterprise/entities/contact";

export interface LeadContactRaw {
  id: string;
  leadId: string;
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  isPrimary: boolean;
  isActive: boolean;
  languages?: string | null;
}

export interface LeadWithContacts {
  lead: Lead;
  contacts: LeadContactRaw[];
  secondaryCNAEIds: string[];
  techProfile: {
    languageIds: string[];
    frameworkIds: string[];
    hostingIds: string[];
    databaseIds: string[];
    erpIds: string[];
    crmIds: string[];
    ecommerceIds: string[];
  };
}

export interface ConversionPayload {
  lead: Lead;
  organization: Organization;
  contacts: Array<{ contact: Contact; sourceLeadContactId: string }>;
  secondaryCNAEIds: string[];
  techProfile: LeadWithContacts["techProfile"];
}

export interface ConversionResult {
  organizationId: string;
  contactIds: string[];
}

export abstract class LeadConversionRepository {
  abstract findLeadWithContacts(leadId: string): Promise<LeadWithContacts | null>;
  abstract execute(payload: ConversionPayload): Promise<ConversionResult>;
}
