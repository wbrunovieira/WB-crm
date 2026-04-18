export interface OrganizationSummary {
  id: string;
  ownerId: string;
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industry: string | null;
  companySize: string | null;
  hasHosting: boolean;
  hostingRenewalDate: Date | null;
  sourceLeadId: string | null;
  driveFolderId: string | null;
  inOperationsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  owner: { id: string; name: string; email: string } | null;
  primaryCNAE: { id: string; code: string; description: string } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  _count: { contacts: number; deals: number };
}

export interface OrganizationTechProfile {
  languages: string[];
  frameworks: string[];
  hosting: string[];
  databases: string[];
  erps: string[];
  crms: string[];
  ecommerces: string[];
}

export interface OrganizationDetail extends OrganizationSummary {
  // Additional scalar fields
  foundationDate: Date | null;
  website: string | null;
  zipCode: string | null;
  streetAddress: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  taxId: string | null;
  description: string | null;
  companyOwner: string | null;
  languages: string | null;
  internationalActivity: string | null;
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  twitter: string | null;
  tiktok: string | null;
  externalProjectIds: string | null;
  hostingPlan: string | null;
  hostingValue: number | null;
  hostingReminderDays: number;
  hostingNotes: string | null;

  // Relations
  contacts: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    whatsapp: string | null;
    role: string | null;
    isPrimary: boolean;
  }>;
  deals: Array<{
    id: string;
    title: string;
    value: number | null;
    status: string;
    createdAt: Date;
  }>;
  secondaryCNAEs: Array<{ id: string; code: string; description: string }>;
  sectors: Array<{ id: string; name: string }>;
  icps: Array<{ id: string; name: string }>;
  techProfile: OrganizationTechProfile;
}
