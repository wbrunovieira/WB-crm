import { apiFetch } from "./api";
import { geocodeAddress } from "./location";

/** Activity types that represent an in-person visit/check-in — physical_visit (door-to-door,
 *  historically lead-only in this app, but the web CRM also uses it for organizations) and
 *  meeting (the web CRM's existing type for a scheduled presential meeting). */
const VISIT_TYPES = new Set(["physical_visit", "meeting"]);

export type TodayVisitKind = "lead" | "organization";

/** What already happened to a visit on its day. The screen used to fetch only pending ones,
 *  so a visit vanished from the list the moment it was marked done — exactly when the rep
 *  wanted to confirm they had been there. */
export type TodayVisitStatus = "pending" | "done" | "failed" | "skipped";

/** One pending visit/meeting due today, for a lead OR an organization. */
export interface TodayScheduledVisit {
  activityId: string;
  kind: TodayVisitKind;
  entityId: string;
  name: string;
  subject: string;
  type: string;
  status: TodayVisitStatus;
  dueDate: string | null;
  /** Quantas vezes a visita ja foi adiada — sai da propria descricao (ver MARCA_ADIAMENTO).
   *  Visita empurrada varias vezes e sinal de lead que nao vai fechar, e o vendedor merece
   *  ver isso sem abrir a atividade. */
  postponedCount: number;
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
  description?: string | null;
  id: string;
  type: string;
  subject: string;
  dueDate: string | null;
  completed: boolean;
  failedAt: string | null;
  skippedAt: string | null;
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

/** physical_visit/meeting activities due on a given day, across BOTH leads and
 *  organizations — "estou na rua, o que tenho pra visitar hoje" (and "o que fica pra amanhã /
 *  o que ficou atrasado de ontem", via dayOffset — negative for past days, positive for future).
 *  No backend filter for "type is one of several" or "has a lead OR organization" exists, so
 *  this fetches broadly (that day's pending activities) and filters client-side — a single
 *  rep's daily volume is always small. */
/** Marca deixada na descricao a cada adiamento — e tambem como o contador e calculado.
 *  Guardar na descricao evita coluna nova no schema para uma informacao que so o vendedor le. */
export const MARCA_ADIAMENTO = "[adiada";

function contarAdiamentos(description: string | null): number {
  if (!description) return 0;
  return description.split(MARCA_ADIAMENTO).length - 1;
}

/** Visitas PENDENTES cujo dia ja passou. Existem porque a lista do dia e estrita: sem isto,
 *  uma visita que o vendedor nao fez fica no dia dela e some da vista — esquecer de adiar
 *  equivalia a perder a visita. Limite de 30 dias para tras: mais que isso nao e atraso, e
 *  abandono, e poluiria a tela do dia. */
export async function listOverdueVisits(): Promise<TodayScheduledVisit[]> {
  const inicioDeHoje = new Date();
  inicioDeHoje.setHours(0, 0, 0, 0);
  const trintaDiasAtras = new Date(inicioDeHoje);
  trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

  const activities = await apiFetch<ActivityRow[]>(
    `/activities?owner=mine&dateFrom=${encodeURIComponent(trintaDiasAtras.toISOString())}&dateTo=${encodeURIComponent(inicioDeHoje.toISOString())}`,
  );

  return mapearVisitas(activities)
    .filter((v) => v.status === "pending")
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
}

export async function listScheduledVisitsForDay(dayOffset: number = 0): Promise<TodayScheduledVisit[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + dayOffset);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  // No `completed` filter on purpose: the screen shows the whole day, done and pending alike.
  // Filtering to completed=false made a visit vanish the moment the rep marked it as visited —
  // precisely when they wanted to confirm they had been there.
  const activities = await apiFetch<ActivityRow[]>(
    `/activities?owner=mine&dateFrom=${encodeURIComponent(start.toISOString())}&dateTo=${encodeURIComponent(end.toISOString())}`,
  );

  return mapearVisitas(activities).sort((a, b) => {
    const pending = Number(b.status === "pending") - Number(a.status === "pending");
    if (pending !== 0) return pending;
    return (a.dueDate ?? "").localeCompare(b.dueDate ?? "");
  });
}

/** Converte as atividades cruas em visitas, descartando o que nao e visita/reuniao e o que nao
 *  tem lead nem organizacao. Compartilhado entre a lista do dia e a das atrasadas para que as
 *  duas telas nunca discordem sobre o que conta como visita. */
function mapearVisitas(activities: ActivityRow[]): TodayScheduledVisit[] {
  const visits: TodayScheduledVisit[] = [];
  for (const a of activities) {
    const status = visitStatus(a);
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
        status,
        dueDate: a.dueDate,
        postponedCount: contarAdiamentos(a.description ?? null),
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
        status,
        dueDate: a.dueDate,
        postponedCount: contarAdiamentos(a.description ?? null),
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

/** `completed` wins over the outcome timestamps: an activity can be both failed and later
 *  completed, and what the rep needs to see is the final state. */
function visitStatus(a: ActivityRow): TodayVisitStatus {
  if (a.completed) return "done";
  if (a.failedAt) return "failed";
  if (a.skippedAt) return "skipped";
  return "pending";
}

/** A today's-visit pin ready to place on the map (coordinates resolved). */
export interface TodayVisitMapPin {
  activityId: string;
  kind: TodayVisitKind;
  entityId: string;
  name: string;
  subject: string;
  status: TodayVisitStatus;
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
        status: v.status,
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
          status: v.status,
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


/** Adia a visita para outro dia. Uma atividade so, com a data trocada e o movimento anotado na
 *  descricao — em vez de pular a antiga e criar outra, que encheria o historico de duplicatas.
 *  O rastro e automatico de proposito: exigir motivo digitado na rua garante motivo inutil. */
export async function adiarVisita(activityId: string, novaData: Date): Promise<void> {
  const atual = await apiFetch<{ description: string | null; dueDate: string | null }>(
    `/activities/${activityId}`,
  );

  const de = atual.dueDate ? new Date(atual.dueDate) : null;
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const linha = `${MARCA_ADIAMENTO} de ${de ? fmt(de) : "?"} para ${fmt(novaData)}]`;
  const anterior = atual.description?.trim();

  // Preserva a hora original: adiar e mudar de DIA, nao remarcar o horario combinado.
  const destino = new Date(novaData);
  if (de) destino.setHours(de.getHours(), de.getMinutes(), 0, 0);

  await apiFetch(`/activities/${activityId}`, {
    method: "PATCH",
    body: {
      dueDate: destino.toISOString(),
      description: anterior ? `${anterior}\n${linha}` : linha,
    },
  });
}

/** Desiste da visita — "mudei de ideia", diferente de "nao deu tempo". Sem isto, um lead ja
 *  descartado voltaria a aparecer na lista para sempre. Motivo e opcional por decisao: cobrar
 *  texto de quem esta na rua produz texto vazio, nao informacao. */
export async function desistirDaVisita(activityId: string, motivo?: string): Promise<void> {
  await apiFetch(`/activities/${activityId}/skip`, {
    method: "PATCH",
    body: { reason: motivo?.trim() || "Sem motivo informado" },
  });
}
