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

/**
 * A pre-shaped enrollment candidate for bulk enrollment. The adapter resolves
 * the (many) source tables and returns a flat list; the use case only dedups,
 * validates the email (via the EmailAddress VO) and creates recipients.
 */
export interface EnrollmentCandidate {
  /** Exact dedup key, e.g. "LEAD:<id>", "LEAD_CONTACT:<id>", "CONTACT:<id>". */
  dedupKey: string;
  recipientType: "LEAD" | "CONTACT";
  recipientId: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  customVars?: Record<string, string>;
}

/** A lead/org surfaced by the recipient search (with an email count + preview). */
export interface RecipientSearchResult {
  key: string;
  entityType: "lead" | "organization";
  entityId: string;
  name: string | null;
  email?: string;
  emailCount: number;
  previewEmails: string[];
}

/** Names resolved for a (suppressed) email across the owner's leads/contacts. */
export interface EmailEntityNames {
  leadName: string | null;
  contactName: string | null;
}

export abstract class EnrollmentSourceRepository {
  abstract findLeadEnrollment(leadId: string): Promise<LeadEnrollmentView | null>;
  abstract findOrgEnrollment(orgId: string): Promise<OrgEnrollmentView | null>;
  /** All enrollment candidates owned by `ownerId`, optionally filtered by sourceGroup. */
  abstract findBulkEnrollmentCandidates(ownerId: string, sourceGroup?: string): Promise<EnrollmentCandidate[]>;
  /** Distinct, sorted sourceGroups across the owner's leads and organizations. */
  abstract findSourceGroups(ownerId: string): Promise<string[]>;
  /** Search the owner's leads/orgs (by name/email/contact) as enrollable entities. */
  abstract searchEnrollable(ownerId: string, term: string): Promise<RecipientSearchResult[]>;
  /** Resolve a lead/contact name for an email (used to enrich the suppression list). */
  abstract resolveEmailEntityNames(ownerId: string, email: string): Promise<EmailEntityNames>;
}
