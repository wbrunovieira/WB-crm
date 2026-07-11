import type { Activity } from "@/components/leads/activities/activity-types";

export interface PartnerContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  role?: string | null;
  whatsapp?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  isPrimary?: boolean;
  status?: string;
}

/**
 * Partner timeline activity — the shared rich Activity shape (consumed by the same
 * SortableActivityItem the lead page uses) plus createdAt, which the backend rolls up.
 */
export type PartnerActivity = Activity & { createdAt: Date | string };

export interface PartnerReferredLead {
  id: string;
  businessName: string;
  status: string;
  createdAt: Date | string;
  /** Set when the referred lead has been converted into an Organization (client). */
  convertedToOrganizationId: string | null;
}

export interface Partner {
  id: string;
  name: string;
  legalName: string | null;
  foundationDate: Date | string | null;
  partnerType: string;
  /** Lifecycle stage: prospect (partner lead) | active (officialized) | inactive. */
  partnerStatus: string;
  partnershipStartedAt: string | null;
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
  starRating: number | null;
  lastContactDate: string | null;
  /** Most recent contact-type activity date (derived by the backend). */
  lastContactAt: string | null;
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
