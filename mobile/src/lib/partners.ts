import { apiFetch } from "./api";
import type { ContactInput } from "./leads";

/** Same 11 partnerType values as the web CRM (src/lib/lists/partner-types.ts). */
export const PARTNER_TYPES: { value: string; label: string }[] = [
  { value: "agencia_digital", label: "Agência Digital" },
  { value: "consultoria", label: "Consultoria" },
  { value: "universidade", label: "Universidade" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "indicador", label: "Indicador / Afiliado" },
  { value: "investidor", label: "Investidor" },
  { value: "mentor", label: "Mentor / Coach" },
  { value: "parceiro_tecnologico", label: "Parceiro Tecnológico" },
  { value: "associacao", label: "Associação / Entidade" },
  { value: "midia", label: "Mídia / Imprensa" },
  { value: "outros", label: "Outros" },
];

const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);

export interface CreatedPartner {
  id: string;
  name: string;
}

/** Fields captured for a new partner (company-level; the contact person is separate). */
export interface PartnerFields {
  name: string;
  partnerType: string;
  website?: string;
  phone?: string;
  notes?: string;
}

export function partnerBody(f: PartnerFields) {
  return {
    name: f.name.trim(),
    partnerType: f.partnerType,
    website: clean(f.website),
    phone: clean(f.phone),
    notes: clean(f.notes),
  };
}

export function createPartner(body: ReturnType<typeof partnerBody>): Promise<CreatedPartner> {
  return apiFetch<CreatedPartner>("/partners", { method: "POST", body });
}

/** Partners reuse the generic Contact model (no embedded contacts[] on create, unlike leads) —
 *  a separate `POST /contacts` with `partnerId` instead of `leadId`. */
async function addPartnerContact(partnerId: string, contact: ContactInput): Promise<void> {
  await apiFetch("/contacts", {
    method: "POST",
    body: {
      name: contact.name.trim(),
      role: clean(contact.role),
      email: clean(contact.email),
      phone: clean(contact.phone),
      whatsapp: clean(contact.whatsapp),
      partnerId,
    },
  });
}

/** Creates the partner and, if a contact person was captured, adds them — non-fatal: a created
 *  partner is never undone by a failed contact add (mirrors createLeadWithVisit's pattern). */
export async function createPartnerWithContact(
  body: ReturnType<typeof partnerBody>,
  contact?: ContactInput,
): Promise<{ partner: CreatedPartner; contactLogged: boolean }> {
  const partner = await createPartner(body);
  let contactLogged = true;
  if (contact && contact.name.trim()) {
    try {
      await addPartnerContact(partner.id, contact);
    } catch {
      contactLogged = false;
    }
  }
  return { partner, contactLogged };
}
