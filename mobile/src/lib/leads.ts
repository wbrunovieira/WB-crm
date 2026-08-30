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

/** True if `iso` falls on today's local calendar day. */
function isToday(iso: string): boolean {
  return localDayKey(new Date(iso)) === localDayKey(new Date());
}

/** Finds an already-logged physical_visit today among a lead's activities, if any — also used by
 *  the lead detail screen to switch "Registrar visita" into "Adicionar observação" mode. Keys off
 *  `completedAt` (same field `listVisitsForDay`/`listVisitCountsByDay` use to define "a visit"),
 *  not `createdAt`, for consistency across the app. */
export function findTodaysVisitId(activities: LeadActivitySummary[]): string | undefined {
  return activities.find((a) => a.type === "physical_visit" && a.completedAt && isToday(a.completedAt))?.id;
}

async function getActivityDescription(activityId: string): Promise<string | null> {
  const activity = await apiFetch<{ description: string | null }>(`/activities/${activityId}`);
  return activity.description;
}

/** Merges new info into an already-logged visit instead of creating a duplicate activity: the
 *  note is appended (time-stamped, so repeat same-day additions stay legible, never overwriting
 *  what was already noted) and, if a contact type was given, it's overwritten — unlike notes,
 *  it's a single classification, not free text to accumulate, so the latest read wins. Returns
 *  whether anything was actually written, so callers don't claim a note was added when the rep
 *  submitted with nothing filled in (e.g. re-searching Google just to double-check a lead). */
async function mergeIntoVisit(activityId: string, notes: string | undefined, contactType: ContactType | undefined): Promise<boolean> {
  const patch: { description?: string; callContactType?: string } = {};
  if (notes && notes.trim()) {
    const current = await getActivityDescription(activityId);
    const stamp = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    patch.description = current && current.trim() ? `${current.trim()}\n[${stamp}] ${notes.trim()}` : notes.trim();
  }
  if (contactType) patch.callContactType = contactType;
  if (Object.keys(patch).length === 0) return false;
  await apiFetch(`/activities/${activityId}`, { method: "PATCH", body: patch });
  return true;
}

/**
 * Logs a visit for a lead — or, if one was already logged today, merges the new note into that
 * existing visit instead of creating a duplicate "Visita porta a porta" activity. This is the
 * common "came back to add something I forgot" case, not a fresh visit: without this, re-capturing
 * a business already visited today (e.g. via the Google-mode dedup merge, or hitting "Registrar
 * visita" again from the lead page) silently created a second, near-identical activity every time.
 * `merged` is whether an existing visit was matched at all; `updated` is whether the merge
 * actually wrote anything (false when both notes and contactType were empty).
 */
export async function logOrMergeVisit(
  leadId: string,
  businessName: string,
  notes: string | undefined,
  contactType: ContactType | undefined,
  activities: LeadActivitySummary[],
): Promise<{ visitActivityId?: string; merged: boolean; updated: boolean }> {
  const existingVisitId = findTodaysVisitId(activities);
  if (existingVisitId) {
    const updated = await mergeIntoVisit(existingVisitId, notes, contactType);
    return { visitActivityId: existingVisitId, merged: true, updated };
  }
  const created = await createVisitActivity(leadId, businessName, notes, contactType);
  return { visitActivityId: created.id, merged: false, updated: true };
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
  visitMerged: boolean;
  visitUpdated: boolean;
}> {
  let contactLogged = true;
  if (contact && contact.name.trim()) {
    try {
      await addLeadContact(leadId, contact);
    } catch {
      contactLogged = false;
    }
  }

  // Look up today's activities to decide merge-vs-create below — best-effort: if this fails,
  // `activities` stays empty and logOrMergeVisit just creates a normal new visit, same as before
  // this check existed.
  let activities: LeadActivitySummary[] = [];
  try {
    activities = (await getLeadDetail(leadId)).activities;
  } catch {
    // ignore — see comment above
  }

  // Decided upfront (not just read off a successful result) so a failed merge attempt still
  // reports "a observação" rather than "a visita" wasn't saved — see visitLogged's warn message.
  const visitMerged = !!findTodaysVisitId(activities);
  let visitLogged = true;
  let visitActivityId: string | undefined;
  let visitUpdated = true;
  try {
    const result = await logOrMergeVisit(leadId, businessName, opts.notes, opts.contactType, activities);
    visitActivityId = result.visitActivityId;
    visitUpdated = result.updated;
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

  return { lead: { id: leadId, businessName }, contactLogged, visitLogged, followUpLogged, visitActivityId, visitMerged, visitUpdated };
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
  leadId: string;
  businessName: string;
  completedAt: string | null;
}

/** Visits logged on one local calendar day (0 = today, 1 = yesterday, ...) — powers "Meus
 *  cadastros do dia"'s day navigator. Relies on createVisitActivity setting `dueDate`. */
export async function listVisitsForDay(daysAgo: number): Promise<TodayVisit[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - daysAgo);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const activities = await apiFetch<
    Array<{ id: string; completedAt: string | null; lead: { id: string; businessName: string } | null }>
  >(
    `/activities?type=physical_visit&owner=mine&dateFrom=${encodeURIComponent(start.toISOString())}&dateTo=${encodeURIComponent(end.toISOString())}`,
  );

  return activities
    .filter((a) => a.lead)
    .map((a) => ({ id: a.id, leadId: a.lead!.id, businessName: a.lead!.businessName, completedAt: a.completedAt }));
}

/** Visits logged today — the home screen's "X/Y hoje" pill and the default day shown by
 *  "Meus cadastros do dia" both use this. */
export function listTodayVisits(): Promise<TodayVisit[]> {
  return listVisitsForDay(0);
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

/** A pin on the leads map — only leads with a captured GPS position have one. */
export interface LeadMapPin {
  id: string;
  businessName: string;
  latitude: number;
  longitude: number;
  status: string;
  quality: string | null;
  city: string | null;
  state: string | null;
}

interface LeadMapRow extends LeadSearchResult {
  latitude: number | null;
  longitude: number | null;
}

/** Door-to-door leads (sourceGroup=porta-a-porta — everything this app creates) that have a
 *  captured GPS position, for the map screen. Leads without coordinates (manual/card capture
 *  without tapping "Usar minha localização") are silently skipped — no pin to place for them.
 *  pageSize=200 (the API's max) — a personal-use rep's door-to-door leads shouldn't exceed that;
 *  no pagination UI on the map, this is a best-effort "recent captures nearby" view, not an
 *  exhaustive list. */
export async function listLeadsForMap(): Promise<LeadMapPin[]> {
  const result = await apiFetch<{ leads: LeadMapRow[] }>(
    `/leads?sourceGroup=porta-a-porta&owner=mine&pageSize=200`,
  );
  return result.leads
    .filter((l): l is LeadMapRow & { latitude: number; longitude: number } => l.latitude != null && l.longitude != null)
    .map((l) => ({
      id: l.id,
      businessName: l.businessName,
      latitude: l.latitude,
      longitude: l.longitude,
      status: l.status,
      quality: l.quality,
      city: l.city,
      state: l.state,
    }));
}

/** A pending follow-up on the map — the second pin type (Fase 3), alongside already-captured
 *  leads (LeadMapPin). Distinguished by `activityId`/`subject`/`dueDate` instead of `status`. */
export interface PendingActivityMapPin {
  activityId: string;
  leadId: string;
  businessName: string;
  subject: string;
  dueDate: string | null;
  latitude: number;
  longitude: number;
}

interface ActivityMapRow {
  id: string;
  subject: string;
  dueDate: string | null;
  lead: { id: string; businessName: string; latitude: number | null; longitude: number | null } | null;
}

/** Pending (not completed, not failed/skipped — same semantics `completed=false` already has
 *  server-side) follow-ups whose lead has a captured GPS position. Every activity type (task,
 *  call, meeting, whatsapp...) is included, not just physical_visit — any open follow-up on a
 *  mappable lead is useful to see "near me". */
export async function listPendingActivitiesForMap(): Promise<PendingActivityMapPin[]> {
  const activities = await apiFetch<ActivityMapRow[]>(`/activities?completed=false&owner=mine`);
  return activities
    .filter(
      (a): a is ActivityMapRow & { lead: { id: string; businessName: string; latitude: number; longitude: number } } =>
        a.lead != null && a.lead.latitude != null && a.lead.longitude != null,
    )
    .map((a) => ({
      activityId: a.id,
      leadId: a.lead.id,
      businessName: a.lead.businessName,
      subject: a.subject,
      dueDate: a.dueDate,
      latitude: a.lead.latitude,
      longitude: a.lead.longitude,
    }));
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
  latitude: number | null;
  longitude: number | null;
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
