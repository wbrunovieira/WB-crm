export interface LeadSummary {
  id: string;
  ownerId: string;
  businessName: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  status: string;
  quality: string | null;
  isArchived: boolean;
  isProspect: boolean;
  city: string | null;
  state: string | null;
  country: string | null;
  starRating: number | null;
  fieldsFilled: number | null;
  convertedToOrganizationId: string | null;
  convertedAt: Date | null;
  referredByPartnerId: string | null;
  driveFolderId: string | null;
  inOperationsAt: Date | null;
  sourceGroup: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  owner: { id: string; name: string; email: string } | null;
  referredByPartner: { id: string; name: string } | null;
  labels: Array<{ id: string; name: string; color: string }>;
  primaryCNAE: { id: string; code: string; description: string } | null;
}

export interface LeadContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  isPrimary: boolean;
  isActive: boolean;
  linkedin: string | null;
  instagram: string | null;
  convertedToContactId: string | null;
  languages: string | null;
  // Verification
  whatsappVerified: boolean;
  whatsappVerifiedAt: Date | null;
  whatsappVerifiedNumber: string | null;
  emailVerified: boolean | null;
  emailVerifiedAt: Date | null;
  emailVerificationStatus: string | null;
  emailVerificationReason: string | null;
  phoneValid: boolean | null;
  phoneType: string | null;
}

export interface LeadActivity {
  id: string;
  type: string;
  subject: string;
  completed: boolean;
  completedAt: Date | null;
  dueDate: Date | null;
  createdAt: Date;
  gotoCallId: string | null;
  gotoCallOutcome: string | null;
  gotoDuration: number | null;
  gotoRecordingUrl: string | null;
  gotoRecordingUrl2: string | null;
  gotoTranscriptText: string | null;
}

export interface LeadTechProfile {
  languages: string[];
  frameworks: string[];
  hosting: string[];
  databases: string[];
  erps: string[];
  crms: string[];
  ecommerces: string[];
}

export interface LeadDetail extends LeadSummary {
  // Additional scalar fields
  registeredName: string | null;
  foundationDate: Date | null;
  companyRegistrationID: string | null;
  address: string | null;
  zipCode: string | null;
  vicinity: string | null;
  whatsappVerified: boolean;
  whatsappVerifiedAt: Date | null;
  whatsappVerifiedNumber: string | null;
  emailVerified: boolean | null;
  emailVerifiedAt: Date | null;
  emailVerificationStatus: string | null;
  emailVerificationReason: string | null;
  phoneValid: boolean | null;
  phoneType: string | null;
  phone2Valid: boolean | null;
  phone2Type: string | null;
  whatsappPhoneValid: boolean | null;
  whatsappPhoneType: string | null;
  website: string | null;
  instagram: string | null;
  linkedin: string | null;
  facebook: string | null;
  twitter: string | null;
  tiktok: string | null;
  googleId: string | null;
  categories: string | null;
  rating: number | null;
  priceLevel: number | null;
  userRatingsTotal: number | null;
  permanentlyClosed: boolean;
  types: string | null;
  companyOwner: string | null;
  companySize: string | null;
  revenue: number | null;
  employeesCount: number | null;
  description: string | null;
  equityCapital: number | null;
  businessStatus: string | null;
  languages: string | null;
  primaryActivity: string | null;
  secondaryActivities: string | null;
  internationalActivity: string | null;
  source: string | null;
  searchTerm: string | null;
  category: string | null;
  radius: number | null;
  revenueRange: string | null;
  segment: string | null;
  legalNature: string | null;
  branchType: string | null;
  simplesNacional: boolean | null;
  isMei: boolean | null;
  phone2: string | null;
  socialMedia: string | null;
  metaAds: string | null;
  googleAds: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
  openingHours: string | null;
  googlePlacesSearchId: string | null;
  archivedAt: Date | null;
  archivedReason: string | null;
  activityOrder: string | null;
  agentSummary: string | null;
  agentUpdatedFields: string | null;
  agentResearchAt: Date | null;
  notes: string | null;
  parentLeadId: string | null;

  // Relations
  leadContacts: LeadContact[];
  activities: LeadActivity[];
  secondaryCNAEs: Array<{ id: string; code: string; description: string }>;
  techProfile: LeadTechProfile;
  parentLead: { id: string; businessName: string } | null;
  childLeads: Array<{ id: string; businessName: string }>;
}
