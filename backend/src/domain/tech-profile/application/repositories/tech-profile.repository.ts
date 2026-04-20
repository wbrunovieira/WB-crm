export type TechProfileType = "language" | "framework" | "hosting" | "database" | "erp" | "crm" | "ecommerce";

export const TECH_PROFILE_TYPES: TechProfileType[] = ["language", "framework", "hosting", "database", "erp", "crm", "ecommerce"];

export interface TechProfileItem {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
}

export interface TechProfileResult {
  languages: TechProfileItem[];
  frameworks: TechProfileItem[];
  hosting: TechProfileItem[];
  databases: TechProfileItem[];
  erps: TechProfileItem[];
  crms: TechProfileItem[];
  ecommerce: TechProfileItem[];
}

export abstract class TechProfileRepository {
  abstract getAvailableItems(type: TechProfileType): Promise<TechProfileItem[]>;

  abstract getLeadTechProfile(leadId: string): Promise<TechProfileResult>;
  abstract addToLead(leadId: string, type: TechProfileType, itemId: string): Promise<void>;
  abstract removeFromLead(leadId: string, type: TechProfileType, itemId: string): Promise<void>;

  abstract getOrganizationTechProfile(organizationId: string): Promise<TechProfileResult>;
  abstract addToOrganization(organizationId: string, type: TechProfileType, itemId: string): Promise<void>;
  abstract removeFromOrganization(organizationId: string, type: TechProfileType, itemId: string): Promise<void>;
}
