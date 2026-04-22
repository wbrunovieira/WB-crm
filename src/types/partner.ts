export interface PartnerContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  role?: string | null;
}

export interface PartnerActivity {
  id: string;
  type: string;
  subject: string;
  dueDate: Date | string | null;
  completed: boolean;
  createdAt: Date | string;
}

export interface PartnerReferredLead {
  id: string;
  businessName: string;
  status: string;
  createdAt: Date | string;
  convertedOrganization?: { id: string; name: string } | null;
}

export interface Partner {
  id: string;
  name: string;
  legalName: string | null;
  foundationDate: Date | string | null;
  partnerType: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  zipCode: string | null;
  streetAddress: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  industry: string | null;
  employeeCount: number | null;
  companySize: string | null;
  description: string | null;
  expertise: string | null;
  notes: string | null;
  lastContactDate: string | null;
  createdAt: string | Date;
  contacts: PartnerContact[];
  activities: PartnerActivity[];
  referredLeads: PartnerReferredLead[];
  _count: {
    contacts: number;
    activities: number;
    referredLeads: number;
  };
  owner?: { id: string; name: string; email?: string | null } | null;
}
