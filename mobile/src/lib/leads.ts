import { apiFetch } from "./api";
import type { Place } from "./places";

/** Field-capture origin tag; groups all door-to-door leads together in the CRM. */
const SOURCE_GROUP = "porta-a-porta";

export interface CreatedLead {
  id: string;
  businessName?: string;
}

/** Google-only fields that enrich a lead sourced from a Google place (not editable in the form). */
function googleEnrichment(place: Place, searchTerm: string) {
  return {
    googleId: place.placeId,
    source: "google_places",
    searchTerm,
    rating: place.rating,
    userRatingsTotal: place.userRatingCount,
    priceLevel: place.priceLevel,
    businessStatus: place.businessStatus,
    types: place.types ? JSON.stringify(place.types) : undefined,
    categories: place.primaryType,
    googleMapsUrl: place.googleMapsUrl,
    openingHours: place.openingHours,
  };
}

/**
 * Lead body for the Google flow: the form fields are the source of truth (seeded from the
 * place, possibly edited by the user) + the contact person + the Google-only enrichment.
 */
export function googleLeadBody(f: ManualLeadFields, contact: ContactInput | undefined, place: Place, searchTerm: string) {
  return { ...manualLeadBody(f, contact), ...googleEnrichment(place, searchTerm) };
}

/** The shapes accepted by `POST /leads`: from the manual form or the Google flow. */
export type LeadBody = ReturnType<typeof manualLeadBody> | ReturnType<typeof googleLeadBody>;

/** Creates a lead (accepts either the Google-place body or the manual body). */
export function createLead(body: LeadBody): Promise<CreatedLead> {
  return apiFetch<CreatedLead>("/leads", { method: "POST", body });
}

/** "decisor" = decision-maker, "gatekeeper" = attendant/receptionist (mirrors the CRM field). */
export type ContactType = "decisor" | "gatekeeper";

const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);

/**
 * Logs the door-to-door visit as a completed `physical_visit` activity. `contactType` records
 * whether the person spoken to was the decision-maker or a gatekeeper (CRM `callContactType`).
 */
export function createVisitActivity(
  leadId: string,
  businessName: string,
  notes?: string,
  contactType?: ContactType,
): Promise<{ id: string }> {
  return apiFetch<{ id: string }>("/activities", {
    method: "POST",
    body: {
      type: "physical_visit",
      subject: `Visita porta a porta — ${businessName}`,
      leadId,
      description: clean(notes),
      completed: true,
      completedAt: new Date().toISOString(),
      callContactType: contactType,
    },
  });
}

/** A scheduled follow-up. Same mechanism as the CRM's "Criar atividade" + 🔔 Notificar-me. */
export interface FollowUp {
  type: string; // task | call | meeting | whatsapp
  subject: string;
  dueAtISO: string;
  remindAtISO?: string; // set = shows in the bell
}

/** Creates the (not-completed) follow-up activity with an optional reminder. */
export function createFollowUpActivity(leadId: string, f: FollowUp): Promise<{ id: string }> {
  return apiFetch<{ id: string }>("/activities", {
    method: "POST",
    body: {
      type: f.type,
      subject: f.subject,
      leadId,
      dueDate: f.dueAtISO,
      remindAt: f.remindAtISO,
      completed: false,
    },
  });
}

/** The person spoken to, saved as the lead's primary contact. */
export interface ContactInput {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
}

/** Fields captured in the manual / GPS lead form (company only; the person is separate). */
export interface ManualLeadFields {
  businessName: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  website?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

/** Builds the `POST /leads` body from the manual form, embedding the contact person if given. */
export function manualLeadBody(f: ManualLeadFields, contact?: ContactInput) {
  const hasContact = Boolean(contact && contact.name.trim());
  return {
    businessName: f.businessName.trim(),
    address: clean(f.address),
    vicinity: clean(f.neighborhood),
    city: clean(f.city),
    state: clean(f.state),
    zipCode: clean(f.zipCode),
    country: clean(f.country),
    phone: clean(f.phone),
    website: clean(f.website),
    description: clean(f.description),
    latitude: f.latitude,
    longitude: f.longitude,
    source: "door_to_door",
    isProspect: false,
    sourceGroup: SOURCE_GROUP,
    contacts: hasContact
      ? [{
          name: contact!.name.trim(),
          role: clean(contact!.role),
          email: clean(contact!.email),
          phone: clean(contact!.phone),
          whatsapp: clean(contact!.whatsapp),
          isPrimary: true,
        }]
      : undefined,
  };
}

export interface CaptureOptions {
  notes?: string;
  contactType?: ContactType;
  followUp?: FollowUp;
}

/**
 * Creates the lead, logs the visit, and (optionally) schedules a follow-up. Each activity is
 * NON-FATAL: a created lead is never undone by a failed activity — the partial outcome is
 * reported instead. `body.businessName` is used for the visit subject.
 */
export async function createLeadWithVisit(
  body: LeadBody,
  opts: CaptureOptions = {},
): Promise<{ lead: CreatedLead; visitLogged: boolean; followUpLogged: boolean }> {
  const lead = await createLead(body);

  let visitLogged = true;
  try {
    await createVisitActivity(lead.id, body.businessName, opts.notes, opts.contactType);
  } catch {
    visitLogged = false;
  }

  let followUpLogged = true;
  if (opts.followUp) {
    try {
      await createFollowUpActivity(lead.id, opts.followUp);
    } catch {
      followUpLogged = false;
    }
  }

  return { lead, visitLogged, followUpLogged };
}
