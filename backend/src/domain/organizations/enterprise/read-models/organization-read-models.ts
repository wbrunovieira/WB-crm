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
  // Paridade com o Lead (ver entidade).
  activityOrder: string | null;
  agentResearchAt: Date | null;
  agentSummary: string | null;
  agentUpdatedFields: string | null;
  businessStatus: string | null;
  categories: string | null;
  category: string | null;
  emailVerificationReason: string | null;
  emailVerificationStatus: string | null;
  emailVerified: boolean | null;
  emailVerifiedAt: Date | null;
  equityCapital: number | null;
  fieldsFilled: number | null;
  googleAds: string | null;
  googleId: string | null;
  googleMapsUrl: string | null;
  isProspect: boolean | null;
  latitude: number | null;
  longitude: number | null;
  metaAds: string | null;
  notes: string | null;
  openingHours: string | null;
  permanentlyClosed: boolean | null;
  phone2Type: string | null;
  phone2Valid: boolean | null;
  phoneType: string | null;
  phoneValid: boolean | null;
  priceLevel: number | null;
  quality: string | null;
  radius: number | null;
  rating: number | null;
  searchTerm: string | null;
  socialMedia: string | null;
  source: string | null;
  starRating: number | null;
  status: string | null;
  types: string | null;
  userRatingsTotal: number | null;
  vicinity: string | null;
  whatsappPhoneType: string | null;
  whatsappPhoneValid: boolean | null;
  whatsappVerified: boolean | null;
  whatsappVerifiedAt: Date | null;
  whatsappVerifiedNumber: string | null;
  sourceLeadId: string | null;
  /** Quando deixou de ser lead ("cliente desde"). Nulo se nunca foi lead. */
  convertedAt: Date | null;
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
  // Campos cadastrais/fiscais herdados do lead na conversão. Existiam no schema e na entidade,
  // mas não eram serializados — o dado ficava gravado e invisível.
  segment: string | null;
  legalNature: string | null;
  branchType: string | null;
  simplesNacional: boolean | null;
  isMei: boolean | null;
  revenueRange: string | null;
  phone2: string | null;
  sourceGroup: string | null;
  referredByPartnerId: string | null;
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
    languages: string | null;
  }>;
  deals: Array<{
    id: string;
    title: string;
    value: number | null;
    currency: string;
    status: string;
    createdAt: Date;
    stage: { id: string; name: string; pipeline: { id: string; name: string } | null } | null;
  }>;
  secondaryCNAEs: Array<{ id: string; code: string; description: string }>;
  sectors: Array<{ id: string; name: string }>;
  icps: Array<{ id: string; name: string }>;
  techProfile: OrganizationTechProfile;
  activities: Array<{
    id: string;
    type: string;
    subject: string;
    description: string | null;
    dueDate: Date | null;
    completed: boolean;
    completedAt: Date | null;
    failedAt: Date | null;
    failReason: string | null;
    skippedAt: Date | null;
    skipReason: string | null;
    emailOpenCount: number;
    emailOpenedAt: Date | null;
    emailLinkClickCount: number;
    emailLinkClickedAt: Date | null;
    emailCampaignSendId: string | null;
    emailCampaignId: string | null;
    createdAt: Date;
    deal: { title: string } | null;
    contact: { name: string } | null;
  }>;
}
