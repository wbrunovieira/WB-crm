import { searchLeads } from "./leads";
import { searchOrganizations } from "./organizations";

/** One row of the combined search list. Leads and organizations are different records on
 *  different routes, so `kind` tells the screen which detail page to open and which accent
 *  to paint — the same lead/org distinction the web CRM makes with a side stripe. */
export interface SearchHit {
  kind: "lead" | "org";
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  phone: string | null;
  /** Lead-only badges; organizations don't carry a prospecting status. */
  status?: string;
  quality?: string | null;
}

/** Searches leads and organizations at once. Both requests go out in parallel; if one route
 *  fails the other's results are still shown, because a half-answer beats an empty screen
 *  when you're standing in front of the customer. Throws only when both fail. */
export async function searchLeadsAndOrgs(query: string): Promise<SearchHit[]> {
  const [leads, orgs] = await Promise.allSettled([
    searchLeads(query),
    searchOrganizations(query),
  ]);

  if (leads.status === "rejected" && orgs.status === "rejected") throw leads.reason;

  const hits: SearchHit[] = [];

  if (orgs.status === "fulfilled") {
    for (const o of orgs.value) {
      hits.push({
        kind: "org",
        id: o.id,
        name: o.name,
        city: o.city,
        state: o.state,
        phone: o.whatsapp ?? o.phone,
      });
    }
  }

  if (leads.status === "fulfilled") {
    for (const l of leads.value) {
      hits.push({
        kind: "lead",
        id: l.id,
        name: l.businessName,
        city: l.city,
        state: l.state,
        phone: l.whatsapp ?? l.phone,
        status: l.status,
        quality: l.quality,
      });
    }
  }

  return hits;
}
