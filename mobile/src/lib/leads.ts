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
  const completedAt = new Date().toISOString();
  return apiFetch<{ id: string }>("/activities", {
    method: "POST",
    body: {
      type: "physical_visit",
      subject: `Visita porta a porta — ${businessName}`,
      leadId,
      description: clean(notes),
      completed: true,
      completedAt,
      // GET /activities filters dateFrom/dateTo by dueDate, not createdAt — set it so
      // "Meus cadastros do dia" (mobile/app/today.tsx) can query today's visits.
      dueDate: completedAt,
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

async function logVisitAndFollowUp(
  leadId: string,
  businessName: string,
  opts: CaptureOptions,
): Promise<{ visitLogged: boolean; followUpLogged: boolean; visitActivityId?: string }> {
  let visitLogged = true;
  let visitActivityId: string | undefined;
  try {
    const visit = await createVisitActivity(leadId, businessName, opts.notes, opts.contactType);
    visitActivityId = visit.id;
  } catch {
    visitLogged = false;
  }

  let followUpLogged = true;
  if (opts.followUp) {
    try {
      await createFollowUpActivity(leadId, opts.followUp);
    } catch {
      followUpLogged = false;
    }
  }

  return { visitLogged, followUpLogged, visitActivityId };
}

/**
 * Creates the lead, logs the visit, and (optionally) schedules a follow-up. Each activity is
 * NON-FATAL: a created lead is never undone by a failed activity — the partial outcome is
 * reported instead. `body.businessName` is used for the visit subject.
 */
export async function createLeadWithVisit(
  body: LeadBody,
  opts: CaptureOptions = {},
): Promise<{ lead: CreatedLead; visitLogged: boolean; followUpLogged: boolean; visitActivityId?: string }> {
  const lead = await createLead(body);
  const rest = await logVisitAndFollowUp(lead.id, body.businessName, opts);
  return { lead, ...rest };
}

/** Adds a contact to an existing lead (`POST /leads/:id/contacts`) — used when a Google-mode
 *  capture hits a dedup (`checkGoogleId` → exists), since the contact can no longer be embedded
 *  into a create call (not fatal there: caller reports contactLogged separately), and by the
 *  lead detail screen's "novo contato" form. */
export async function addLeadContact(leadId: string, contact: ContactInput): Promise<void> {
  await apiFetch(`/leads/${leadId}/contacts`, {
    method: "POST",
    body: {
      name: contact.name.trim(),
      role: clean(contact.role),
      email: clean(contact.email),
      phone: clean(contact.phone),
      whatsapp: clean(contact.whatsapp),
    },
  });
}

/** Basic-fields edit for one existing lead contact (`PATCH /leads/:id/contacts/:contactId`). */
export interface ContactEditPatch {
  name?: string;
  role?: string;
  phone?: string;
  whatsapp?: string;
}

export async function updateLeadContact(leadId: string, contactId: string, patch: ContactEditPatch): Promise<void> {
  await apiFetch(`/leads/${leadId}/contacts/${contactId}`, { method: "PATCH", body: patch });
}

/**
 * A Google-mode capture that turned out to already be a lead (`checkGoogleId` → exists): rather
 * than refusing the whole capture, add the contact/visit/follow-up to the EXISTING lead. This is
 * the common "revisiting a known business" case in door-to-door work, not an error.
 */
export async function addVisitToExistingLead(
  leadId: string,
  businessName: string,
  contact: ContactInput | undefined,
  opts: CaptureOptions = {},
): Promise<{
  lead: CreatedLead;
  visitLogged: boolean;
  followUpLogged: boolean;
  contactLogged: boolean;
  visitActivityId?: string;
}> {
  let contactLogged = true;
  if (contact && contact.name.trim()) {
    try {
      await addLeadContact(leadId, contact);
    } catch {
      contactLogged = false;
    }
  }

  const rest = await logVisitAndFollowUp(leadId, businessName, opts);
  return { lead: { id: leadId, businessName }, contactLogged, ...rest };
}

/** Attaches the storefront photo to the visit activity. Not queued offline (Fase 4's outbox is
 *  JSON-only) — a failure here just shows a warning; the lead/visit are already saved. */
export async function uploadActivityPhoto(activityId: string, photoUri: string): Promise<void> {
  const form = new FormData();
  form.append("file", {
    uri: photoUri,
    name: "fachada.jpg",
    type: "image/jpeg",
  } as unknown as Blob);
  await apiFetch(`/activities/${activityId}/upload-photo`, { method: "POST", body: form });
}

/** A door-to-door visit already confirmed synced to the CRM (for "Meus cadastros do dia"). */
export interface TodayVisit {
  id: string;
  businessName: string;
  completedAt: string | null;
}

/** Visits logged today by the current user — relies on createVisitActivity setting `dueDate`. */
export async function listTodayVisits(): Promise<TodayVisit[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const activities = await apiFetch<
    Array<{ id: string; completedAt: string | null; lead: { businessName: string } | null }>
  >(
    `/activities?type=physical_visit&owner=mine&dateFrom=${encodeURIComponent(start.toISOString())}&dateTo=${encodeURIComponent(end.toISOString())}`,
  );

  return activities
    .filter((a) => a.lead)
    .map((a) => ({ id: a.id, businessName: a.lead!.businessName, completedAt: a.completedAt }));
}

/** Visit count for one local calendar day — powers the home screen's goal/streak gamification. */
export interface DayVisitCount {
  day: string; // YYYY-MM-DD, local calendar day
  count: number;
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Visit counts per local day for the last `days` days (oldest first, today last) — same
 *  `physical_visit` activities `listTodayVisits` uses, just a wider range grouped client-side.
 *  No backend change needed. */
export async function listVisitCountsByDay(days: number): Promise<DayVisitCount[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const rangeStart = new Date(todayStart);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));
  const rangeEnd = new Date(todayStart);
  rangeEnd.setDate(rangeEnd.getDate() + 1); // exclusive upper bound

  const activities = await apiFetch<Array<{ completedAt: string | null; lead: unknown }>>(
    `/activities?type=physical_visit&owner=mine&dateFrom=${encodeURIComponent(rangeStart.toISOString())}&dateTo=${encodeURIComponent(rangeEnd.toISOString())}`,
  );

  const counts = new Map<string, number>();
  for (const a of activities) {
    // Same "only counts as a visit if it has a lead" filter as listTodayVisits — keeps the two
    // functions' definition of "visit" consistent (they're shown side by side on today.tsx).
    if (!a.completedAt || !a.lead) continue;
    const key = localDayKey(new Date(a.completedAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: DayVisitCount[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(d.getDate() + i);
    const key = localDayKey(d);
    result.push({ day: key, count: counts.get(key) ?? 0 });
  }
  return result;
}

/** A row in the "search existing leads" list — the fields `GET /leads` already returns. */
export interface LeadSearchResult {
  id: string;
  businessName: string;
  phone: string | null;
  whatsapp: string | null;
  status: string;
  quality: string | null;
  city: string | null;
  state: string | null;
}

/** Searches leads by name, scoped to the current user (`owner=mine`, same convention as the
 *  rest of the app — see mobile/CLAUDE.md). GET /leads is paginated; only `leads` is used here. */
export async function searchLeads(query: string): Promise<LeadSearchResult[]> {
  const result = await apiFetch<{ leads: LeadSearchResult[] }>(
    `/leads?search=${encodeURIComponent(query)}&owner=mine`,
  );
  return result.leads;
}

/** A recent activity embedded in the lead detail — trimmed to what the field screen shows. */
export interface LeadActivitySummary {
  id: string;
  type: string;
  subject: string;
  createdAt: string;
  completedAt: string | null;
}

/** The subset of `GET /leads/:id` (LeadDetail) the field screen actually renders — the full
 *  response has 100+ fields (ICP, deep research, tech profile, Receita Federal data, deals…)
 *  irrelevant to a door-to-door rep; this only types what's used. */
export interface LeadDetail {
  id: string;
  businessName: string;
  status: string;
  quality: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  activities: LeadActivitySummary[];
}

export function getLeadDetail(id: string): Promise<LeadDetail> {
  return apiFetch<LeadDetail>(`/leads/${id}`);
}

export interface LeadContact {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
  whatsapp: string | null;
  isPrimary: boolean;
}

export function getLeadContacts(id: string): Promise<LeadContact[]> {
  return apiFetch<LeadContact[]>(`/leads/${id}/contacts`);
}

/** Basic-fields edit from the field screen — a partial `PATCH /leads/:id` (same endpoint/DTO
 *  the web edit form uses; only send what actually changed). */
export interface LeadEditPatch {
  businessName?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  website?: string;
}

/** The caller refetches `getLeadDetail` after this to pick up the change — the PATCH response's
 *  serialization shape isn't guaranteed to match `LeadDetail` (e.g. no `activities`). */
export async function updateLead(id: string, patch: LeadEditPatch): Promise<void> {
  await apiFetch(`/leads/${id}`, { method: "PATCH", body: patch });
}

/** A possible duplicate returned by `POST /leads/check-duplicates` — same fuzzy name/phone/CNPJ/
 *  email/address matching (scored, OR'd) the web CRM's lead-creation form already warns with. */
export interface DuplicateMatch {
  leadId: string;
  businessName: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  isArchived: boolean;
  matchedFields: string[];
  score: number;
}

/** Pre-flight duplicate check (warn, don't block — same UX as the web CRM's create-lead form).
 *  At least one of name/phone/cnpj must be given or the backend rejects with 422. */
export async function checkLeadDuplicates(input: { name?: string; phone?: string; cnpj?: string }): Promise<{
  duplicates: DuplicateMatch[];
  hasDuplicates: boolean;
}> {
  return apiFetch<{ duplicates: DuplicateMatch[]; hasDuplicates: boolean }>(`/leads/check-duplicates`, {
    method: "POST",
    body: input,
  });
}
