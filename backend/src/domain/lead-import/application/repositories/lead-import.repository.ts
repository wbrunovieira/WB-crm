import { Lead } from "@/domain/leads/enterprise/entities/lead";

export interface ImportLeadRowData {
  businessName: string;
  registeredName?: string;
  companyRegistrationID?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  description?: string;
  source?: string;
  quality?: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export abstract class LeadImportRepository {
  abstract findExistingByNames(businessNames: string[], ownerId: string): Promise<Set<string>>;
  abstract findExistingByRegistrationIds(ids: string[], ownerId: string): Promise<Set<string>>;
  abstract batchCreate(leads: Lead[]): Promise<void>;
}
