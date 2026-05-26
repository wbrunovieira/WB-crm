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
  // Contact fields — each maps to a LeadContact field for the primary contact
  contactRole?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactWhatsapp?: string;
  contactLinkedin?: string;
  contactInstagram?: string;
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
  cnaePrincipal?: string;
  cnaesSecundarios?: string;
  sourceGroup?: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  cnaeUpdated: number;
  errors: Array<{ row: number; reason: string }>;
  skippedDetails: Array<{ rowIndex: number; businessName: string; reason: "cnpj" | "name"; existingLeadId?: string }>;
}

export interface ImportContactData {
  leadId: string;
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  linkedin?: string;
  instagram?: string;
  isPrimary: boolean;
}

export abstract class LeadImportRepository {
  abstract findExistingByNames(businessNames: string[], ownerId: string): Promise<Map<string, string>>;
  abstract findExistingByRegistrationIds(ids: string[], ownerId: string): Promise<Map<string, string>>;
  abstract batchCreate(leads: Lead[]): Promise<void>;
  abstract batchCreateContacts(contacts: ImportContactData[]): Promise<void>;
  abstract findOrCreateCnaeByCode(code: string, description: string): Promise<string>;
  abstract batchCreateSecondaryCNAEs(items: Array<{ leadId: string; cnaeId: string }>): Promise<void>;
  abstract updateLeadCnaes(leadId: string, primaryCnaeId: string | undefined, secondaryCnaeIds: string[]): Promise<void>;
}
