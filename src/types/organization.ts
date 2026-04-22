export interface OrganizationContact {
  id: string;
  name: string;
  email: string | null;
  status: string;
  languages: string | null;
}

export interface OrganizationDeal {
  id: string;
  title: string;
  value: number;
  status: string;
  stage: { id: string; name: string };
}

export interface OrganizationActivity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: boolean;
  createdAt: Date | string;
  deal: { title: string } | null;
  contact: { name: string } | null;
}

export interface Organization {
  id: string;
  name: string;
  legalName: string | null;
  foundationDate: Date | string | null;
  website: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  zipCode: string | null;
  streetAddress: string | null;
  industry: string | null;
  employeeCount: number | null;
  annualRevenue: number | null;
  taxId: string | null;
  description: string | null;
  companyOwner: string | null;
  companySize: string | null;
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  twitter: string | null;
  tiktok: string | null;
  labels?: { id: string; name: string; color: string }[];
  primaryCNAEId: string | null;
  internationalActivity: string | null;
  primaryCNAE?: { id: string; code: string; description: string } | null;
  hasHosting: boolean;
  hostingRenewalDate: Date | string | null;
  hostingPlan: string | null;
  hostingValue: number | null;
  hostingReminderDays: number;
  hostingNotes: string | null;
  languages?: string | null;
  inOperationsAt?: string | null;
  externalProjectIds?: string | null;
  createdAt: string | Date;
  contacts: OrganizationContact[];
  deals: OrganizationDeal[];
  activities: OrganizationActivity[];
  owner?: { id: string; name: string; email?: string | null } | null;
}
