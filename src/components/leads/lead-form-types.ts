export interface LeadSummary {
  leadId: string;
  businessName: string;
  companyRegistrationID: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  isArchived: boolean;
  status: string;
}

export interface LeadDuplicates {
  cnpj: LeadSummary[];
  name: LeadSummary[];
  phone: LeadSummary[];
  email: LeadSummary[];
  address: LeadSummary[];
}

export type Lead = {
  id?: string;
  googleId?: string | null;
  businessName: string;
  registeredName?: string | null;
  foundationDate?: string | Date | null;
  companyRegistrationID?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
  vicinity?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  website?: string | null;
  email?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  facebook?: string | null;
  twitter?: string | null;
  tiktok?: string | null;
  categories?: string | null;
  rating?: number | null;
  priceLevel?: number | null;
  userRatingsTotal?: number | null;
  permanentlyClosed?: boolean;
  types?: string | null;
  companyOwner?: string | null;
  companySize?: string | null;
  revenue?: number | null;
  employeesCount?: number | null;
  description?: string | null;
  equityCapital?: number | null;
  businessStatus?: string | null;
  primaryCNAEId?: string | null;
  internationalActivity?: string | null;
  commLanguage?: string | null;
  phone2?: string | null;
  source?: string | null;
  segment?: string | null;
  legalNature?: string | null;
  branchType?: string | null;
  simplesNacional?: boolean | null;
  isMei?: boolean | null;
  revenueRange?: string | null;
  quality?: string | null;
  searchTerm?: string | null;
  sourceGroup?: string | null;
  fieldsFilled?: number | null;
  category?: string | null;
  radius?: number | null;
  status?: string;
  languages?: string | null;
  labels?: { id: string; name: string; color: string }[];
  socialMedia?: string | null;
  metaAds?: string | null;
  googleAds?: string | null;
  starRating?: number | null;
  referredByPartnerId?: string | null;
  parentLeadId?: string | null;
};

export type LeadFormProps = {
  lead?: Lead;
  sourceGroups?: string[];
};

export type ContactFormData = {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  linkedin: string;
  instagram: string;
  role: string;
  isPrimary: boolean;
};

export const emptyContact: ContactFormData = {
  name: "",
  email: "",
  phone: "",
  whatsapp: "",
  linkedin: "",
  instagram: "",
  role: "",
  isPrimary: false,
};
