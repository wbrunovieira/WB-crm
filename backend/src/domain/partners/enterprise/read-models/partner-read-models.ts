export interface PartnerSummary {
  id: string;
  ownerId: string;
  name: string;
  legalName: string | null;
  partnerType: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  industry: string | null;
  expertise: string | null;
  companySize: string | null;
  lastContactDate: Date | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  owner: { id: string; name: string; email: string } | null;
  _count: { contacts: number; activities: number; referredLeads: number };
}

export interface PartnerDetail extends PartnerSummary {
  // Additional scalar fields
  foundationDate: Date | null;
  website: string | null;
  whatsapp: string | null;
  zipCode: string | null;
  streetAddress: string | null;
  employeeCount: number | null;
  description: string | null;
  notes: string | null;
  linkedin: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;

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
  activities: Array<{
    id: string;
    type: string;
    subject: string;
    completed: boolean;
    dueDate: Date | null;
    createdAt: Date;
  }>;
  referredLeads: Array<{
    id: string;
    businessName: string;
    status: string;
    convertedToOrganizationId: string | null;
  }>;
}
