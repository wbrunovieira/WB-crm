import { apiFetch } from "./api";

/** One activity in an organization's history, as GET /organizations/:id embeds it. */
export interface OrgActivity {
  id: string;
  type: string;
  subject: string;
  description: string | null;
  dueDate: string | null;
  completed: boolean;
  completedAt: string | null;
  failedAt: string | null;
  skippedAt: string | null;
}

export interface OrganizationContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  role: string | null;
  isPrimary: boolean;
}

/** An organization as the mobile detail screen needs it. The API payload is far richer (deals,
 *  tech profile, CNAEs, sectors, ICPs, hosting…); only what is actionable in the field is typed
 *  here — the extra keys ride along harmlessly. */
export interface OrganizationDetail {
  id: string;
  name: string;
  legalName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  streetAddress: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  industry: string | null;
  description: string | null;
  contacts: OrganizationContact[] | null;
  // Embedded by the endpoint with no limit and no ordering — sort and cap on the client.
  activities: OrgActivity[] | null;
}

export async function getOrganization(id: string): Promise<OrganizationDetail> {
  return apiFetch<OrganizationDetail>(`/organizations/${id}`);
}

/** Newest first, by due date when there is one. */
export function sortOrgActivities(activities: OrgActivity[]): OrgActivity[] {
  return [...activities].sort((a, b) => (b.dueDate ?? "").localeCompare(a.dueDate ?? ""));
}

/** Single-line address for display and for handing to a navigation app; null when empty. */
export function formatOrgAddress(org: OrganizationDetail): string | null {
  const parts = [org.streetAddress, org.city, org.state, org.zipCode].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}
