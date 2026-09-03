export interface OrganizationContact {
  id: string;
  name: string;
  email: string | null;
  // O payload sempre trouxe estes campos; o tipo não os declarava, então a página os
  // descartava sem que nada acusasse.
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  isPrimary: boolean;
  status: string;
  languages: string | null;
}

export interface OrganizationDeal {
  id: string;
  title: string;
  value: number | null;
  currency: string;
  status: string;
  // Nullable de verdade: declarar como obrigatório escondia o fato de o backend não
  // enviar a etapa, deixando `deal.stage?.name` como código morto na página.
  stage: { id: string; name: string; pipeline: { id: string; name: string } | null } | null;
}

export interface OrganizationActivity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: Date | string | null;
  completed: boolean;
  completedAt: Date | string | null;
  failedAt: Date | string | null;
  failReason: string | null;
  skippedAt: Date | string | null;
  skipReason: string | null;
  emailOpenCount: number;
  emailOpenedAt: Date | string | null;
  emailLinkClickCount: number;
  emailLinkClickedAt: Date | string | null;
  emailCampaignSendId: string | null;
  emailCampaignId: string | null;
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
  // Cadastrais/fiscais herdados do lead na conversão.
  segment: string | null;
  legalNature: string | null;
  branchType: string | null;
  simplesNacional: boolean | null;
  isMei: boolean | null;
  revenueRange: string | null;
  phone2: string | null;
  sourceGroup: string | null;
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
  commLanguage?: string | null;
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
  /** Quando deixou de ser lead ("cliente desde"); nulo se nunca foi lead. */
  convertedAt?: string | Date | null;
  /** Lead de origem — o histórico de prospecção (GPS, Google, verificações) vive lá. */
  sourceLeadId?: string | null;
  contacts: OrganizationContact[];
  deals: OrganizationDeal[];
  activities: OrganizationActivity[];
  owner?: { id: string; name: string; email?: string | null } | null;
}
