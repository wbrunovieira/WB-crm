/**
 * Read-model port for resolving email-campaign enrollment sources (leads /
 * organizations and their emailable contacts). Keeps the email-campaigns
 * enrollment concern out of the core Leads/Organizations repositories and out
 * of the use case (no Prisma in application layer).
 */

export interface EnrollableContact {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
}

export interface LeadEnrollmentView {
  id: string;
  businessName: string | null;
  email: string | null;
  segment: string | null;
  sourceGroup: string | null;
  contacts: EnrollableContact[]; // leadContacts with a non-null email
}

export interface OrgEnrollmentView {
  id: string;
  name: string | null;
  email: string | null;
  segment: string | null;
  sourceGroup: string | null;
  contacts: EnrollableContact[]; // contacts with a non-null email
}

export abstract class EnrollmentSourceRepository {
  abstract findLeadEnrollment(leadId: string): Promise<LeadEnrollmentView | null>;
  abstract findOrgEnrollment(orgId: string): Promise<OrgEnrollmentView | null>;
}
