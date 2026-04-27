import { Lead } from "@/domain/leads/enterprise/entities/lead";

export interface ImportLeadRowData {
  businessName: string;
  registeredName?: string;
  companyRegistrationID?: string;
  foundationDate?: string;
  businessStatus?: string;
  legalNature?: string;
  branchType?: string;
  simplesNacional?: boolean;
  isMei?: boolean;
  email?: string;
  phone?: string;
  phone2?: string;
  whatsapp?: string;
  website?: string;
  address?: string;
  vicinity?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  companyOwner?: string;
  companySize?: string;
  revenue?: number;
  revenueRange?: string;
  equityCapital?: number;
  employeesCount?: number;
  description?: string;
  segment?: string;
  source?: string;
  quality?: string;
  searchTerm?: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
  skippedDetails: Array<{ rowIndex: number; businessName: string; reason: "cnpj" | "name"; existingLeadId?: string }>;
}

export abstract class LeadImportRepository {
  abstract findExistingByNames(businessNames: string[], ownerId: string): Promise<Map<string, string>>;
  abstract findExistingByRegistrationIds(ids: string[], ownerId: string): Promise<Map<string, string>>;
  abstract batchCreate(leads: Lead[]): Promise<void>;
}
