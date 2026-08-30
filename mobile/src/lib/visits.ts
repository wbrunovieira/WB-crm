import { apiFetch } from "./api";
import { geocodeAddress } from "./location";

/** Activity types that represent an in-person visit/check-in — physical_visit (door-to-door,
 *  historically lead-only in this app, but the web CRM also uses it for organizations) and
 *  meeting (the web CRM's existing type for a scheduled presential meeting). */
const VISIT_TYPES = new Set(["physical_visit", "meeting"]);

export type TodayVisitKind = "lead" | "organization";

/** One pending visit/meeting due today, for a lead OR an organization. */
export interface TodayScheduledVisit {
  activityId: string;
  kind: TodayVisitKind;
  entityId: string;
  name: string;
  subject: string;
  type: string;
  dueDate: string | null;
  // Leads already have coordinates (captured via GPS/Google/geocoded address); organizations
  // never do (no lat/lng column), so their raw address is carried instead, resolved on demand
  // for the map — see resolveTodayVisitPins.
  latitude: number | null;
  longitude: number | null;
  address: { street: string | null; city: string | null; state: string | null; zipCode: string | null; country: string | null } | null;
  // Only organizations expose these here (no org detail screen in mobile yet, so the list
  // item offers call/WhatsApp actions directly); leads navigate to /lead/:id instead, which
  // already has full contact info.
  phone: string | null;
  whatsapp: string | null;
}

interface ActivityRow {
  id: string;
  type: string;
  subject: string;
  dueDate: string | null;
  lead: { id: string; businessName: string; latitude: number | null; longitude: number | null } | null;
  organization: {
    id: string;
    name: string;
    streetAddress: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
    country: string | null;
    phone: string | null;
    whatsapp: string | null;
  } | null;
}

/** Pending physical_visit/meeting activities due on a given day, across BOTH leads and
 *  organizations — "estou na rua, o que tenho pra visitar hoje" (and "o que fica pra amanhã /
 *  o que ficou atrasado de ontem", via dayOffset — negative for past days, positive for future).
 *  No backend filter for "type is one of several" or "has a lead OR organization" exists, so
 *  this fetches broadly (that day's pending activities) and filters client-side — a single
 *  rep's daily volume is always small. */
export async function listScheduledVisitsForDay(dayOffset: number = 0): Promise<TodayScheduledVisit[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + dayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const activities = await apiFetch<ActivityRow[]>(
    `/activities?completed=false&owner=mine&dateFrom=${encodeURIComponent(start.toISOString())}&dateTo=${encodeURIComponent(end.toISOString())}`,
  );

  const visits: TodayScheduledVisit[] = [];
  for (const a of activities) {
    if (!VISIT_TYPES.has(a.type)) continue;
    // An activity can carry BOTH leadId and organizationId (e.g. a presential meeting scheduled
    // against a lead that was later converted). Navigation still prefers the lead (it has a
    // dedicated detail screen), but the organization's call/WhatsApp actions must not be
    // silently dropped in that case — they're often the only actionable contact info here.
    if (a.lead) {
      visits.push({
        activityId: a.id,
        kind: "lead",
        entityId: a.lead.id,
        name: a.lead.businessName,
        subject: a.subject,
        type: a.type,
        dueDate: a.dueDate,
        latitude: a.lead.latitude,
        longitude: a.lead.longitude,
        address: null,
        phone: a.organization?.phone ?? null,
        whatsapp: a.organization?.whatsapp ?? null,
      });
    } else if (a.organization) {
      visits.push({
        activityId: a.id,
        kind: "organization",
        entityId: a.organization.id,
        name: a.organization.name,
        subject: a.subject,
        type: a.type,
        dueDate: a.dueDate,
        latitude: null,
        longitude: null,
        address: {
          street: a.organization.streetAddress,
          city: a.organization.city,
          state: a.organization.state,
          zipCode: a.organization.zipCode,
          country: a.organization.country,
        },
        phone: a.organization.phone,
        whatsapp: a.organization.whatsapp,
      });
    }
  }
  return visits;
}

/** A today's-visit pin ready to place on the map (coordinates resolved). */
export interface TodayVisitMapPin {
  activityId: string;
  kind: TodayVisitKind;
  entityId: string;
  name: string;
  subject: string;
  dueDate: string | null;
  latitude: number;
  longitude: number;
}

/** Resolves map-ready coordinates: leads already have them; organizations don't, so their
 *  address is geocoded on demand (Fase 2's geocodeAddress) — sequential, not parallel, to avoid
 *  hammering the on-device geocoder (Apple's own guidance), acceptable since "today's visits"
 *  is always a small, bounded count for a single rep. An org whose address fails to geocode is
 *  silently skipped from the map (it's still visible in list mode). */
export async function resolveTodayVisitPins(visits: TodayScheduledVisit[]): Promise<TodayVisitMapPin[]> {
  const pins: TodayVisitMapPin[] = [];
  for (const v of visits) {
    if (v.latitude != null && v.longitude != null) {
      pins.push({
        activityId: v.activityId,
        kind: v.kind,
        entityId: v.entityId,
        name: v.name,
        subject: v.subject,
        dueDate: v.dueDate,
        latitude: v.latitude,
        longitude: v.longitude,
      });
      continue;
    }
    if (v.address) {
      try {
        const { latitude, longitude } = await geocodeAddress({
          address: v.address.street ?? undefined,
          city: v.address.city ?? undefined,
          state: v.address.state ?? undefined,
          zipCode: v.address.zipCode ?? undefined,
          country: v.address.country ?? undefined,
        });
        pins.push({
          activityId: v.activityId,
          kind: v.kind,
          entityId: v.entityId,
          name: v.name,
          subject: v.subject,
          dueDate: v.dueDate,
          latitude,
          longitude,
        });
      } catch {
        // Geocoding failed/not found for this address — skip the pin, not the whole screen.
      }
    }
  }
  return pins;
}
