import { apiFetch } from "@/lib/api-client";

/** What the header search can find. Each kind lives on its own route and has its own
 *  colour, so the reader can tell a customer from a prospect without reading the label. */
export type SearchKind = "organization" | "lead" | "contact";

export interface SearchHit {
  kind: SearchKind;
  id: string;
  /** Primary line: business name for lead/org, person's name for a contact. */
  name: string;
  /** Secondary line: city/state, or the company a contact belongs to. */
  detail: string | null;
  href: string;
}

/** The three list routes disagree on shape: leads come in a paginated envelope, the other
 *  two as bare arrays. Normalising here keeps that difference out of the component. */
interface LeadRow { id: string; businessName: string; city: string | null; state: string | null }
interface OrgRow { id: string; name: string; city: string | null; state: string | null }
interface ContactRow { id: string; name: string; organization?: { name?: string | null } | null }

const LIMITE_POR_GRUPO = 5;

function lugar(city: string | null, state: string | null): string | null {
  const partes = [city, state].filter(Boolean);
  return partes.length ? partes.join(" - ") : null;
}

export interface SearchResults {
  hits: SearchHit[];
  /** True when at least one of the three routes failed, so the UI can say the list is partial
   *  instead of implying "nothing found" — silence here would read as a confident zero. */
  parcial: boolean;
}

/**
 * Searches organizations, leads and contacts at once.
 *
 * The three run in parallel and failures are tolerated one by one: a half answer beats an
 * empty box, and a box that says "nothing found" when a route simply broke is worse than
 * either. Organizations come first because they are existing customers.
 */
export async function buscarTudo(
  token: string,
  termo: string,
  signal?: AbortSignal,
): Promise<SearchResults> {
  const q = encodeURIComponent(termo);
  const opts = { signal } as RequestInit;

  const [orgs, leads, contatos] = await Promise.allSettled([
    apiFetch<OrgRow[]>(`/organizations?search=${q}`, token, opts),
    apiFetch<{ leads: LeadRow[] }>(`/leads?search=${q}&pageSize=${LIMITE_POR_GRUPO}`, token, opts),
    apiFetch<ContactRow[]>(`/contacts?search=${q}`, token, opts),
  ]);

  const hits: SearchHit[] = [];

  if (orgs.status === "fulfilled") {
    for (const o of orgs.value.slice(0, LIMITE_POR_GRUPO)) {
      hits.push({
        kind: "organization",
        id: o.id,
        name: o.name,
        detail: lugar(o.city, o.state),
        href: `/organizations/${o.id}`,
      });
    }
  }

  if (leads.status === "fulfilled") {
    for (const l of (leads.value.leads ?? []).slice(0, LIMITE_POR_GRUPO)) {
      hits.push({
        kind: "lead",
        id: l.id,
        name: l.businessName,
        detail: lugar(l.city, l.state),
        href: `/leads/${l.id}`,
      });
    }
  }

  if (contatos.status === "fulfilled") {
    for (const c of contatos.value.slice(0, LIMITE_POR_GRUPO)) {
      hits.push({
        kind: "contact",
        id: c.id,
        name: c.name,
        detail: c.organization?.name ?? null,
        href: `/contacts/${c.id}`,
      });
    }
  }

  const parcial = [orgs, leads, contatos].some((r) => r.status === "rejected");
  return { hits, parcial };
}

export const ROTULO: Record<SearchKind, string> = {
  organization: "Clientes",
  lead: "Leads",
  contact: "Contatos",
};

/** Groups hits for display while preserving the order produced above. */
export function agruparPorTipo(hits: SearchHit[]): Array<[SearchKind, SearchHit[]]> {
  const ordem: SearchKind[] = ["organization", "lead", "contact"];
  return ordem
    .map((k) => [k, hits.filter((h) => h.kind === k)] as [SearchKind, SearchHit[]])
    .filter(([, lista]) => lista.length > 0);
}
