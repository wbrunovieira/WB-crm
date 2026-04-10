import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface MatchResult {
  entityType: "contact" | "lead" | "partner";
  entityId: string;
  contactId?: string;
  leadId?: string;
  partnerId?: string;
}

/**
 * Normaliza um número de telefone para apenas dígitos.
 */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Gera variações digit-only do número para busca.
 * "+5571999998888" → ["5571999998888", "71999998888", "999998888"]
 * Cobre: com código país, só DDD+número, só número local
 */
export function phoneVariations(phone: string): string[] {
  const digits = digitsOnly(phone);
  const variations = new Set<string>();

  variations.add(digits);

  // Remove código do Brasil (55) se presente
  if (digits.startsWith("55") && digits.length >= 12) {
    const withoutCountry = digits.slice(2);
    variations.add(withoutCountry);

    // Remove DDD (2 dígitos) para número local
    if (withoutCountry.length >= 10) {
      variations.add(withoutCountry.slice(2));
    }
  }

  // Remove DDD se tiver 10-11 dígitos (DDD + número)
  if (digits.length === 11 || digits.length === 10) {
    variations.add(digits.slice(2));
  }

  // Adiciona prefixo 55 se não tiver
  if (!digits.startsWith("55") && digits.length >= 10) {
    variations.add("55" + digits);
  }

  return Array.from(variations).filter((v) => v.length >= 8);
}

/**
 * Usa regexp_replace no PostgreSQL para normalizar os números armazenados
 * (que podem estar formatados como "(71) 3599-7905") antes de comparar.
 *
 * Isso garante que "+557135997905" bate com "(71) 3599-7905" no banco.
 */
async function findContactByPhone(
  variations: string[],
  ownerId: string
): Promise<string | null> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM contacts
    WHERE "ownerId" = ${ownerId}
      AND (
        regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
        OR regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
      )
    LIMIT 1
  `;
  return result[0]?.id ?? null;
}

async function findLeadByPhone(
  variations: string[],
  ownerId: string
): Promise<string | null> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM leads
    WHERE "ownerId" = ${ownerId}
      AND regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
    LIMIT 1
  `;
  return result[0]?.id ?? null;
}

async function findPartnerByPhone(
  variations: string[],
  ownerId: string
): Promise<string | null> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM partners
    WHERE "ownerId" = ${ownerId}
      AND (
        regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
        OR regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
      )
    LIMIT 1
  `;
  return result[0]?.id ?? null;
}

export async function matchPhoneToEntity(
  dialedNumber: string,
  ownerId: string
): Promise<MatchResult | null> {
  const variations = phoneVariations(dialedNumber);

  // 1. Busca Contact
  const contactId = await findContactByPhone(variations, ownerId);
  if (contactId) {
    return { entityType: "contact", entityId: contactId, contactId };
  }

  // 2. Busca Lead
  const leadId = await findLeadByPhone(variations, ownerId);
  if (leadId) {
    return { entityType: "lead", entityId: leadId, leadId };
  }

  // 3. Busca Partner
  const partnerId = await findPartnerByPhone(variations, ownerId);
  if (partnerId) {
    return { entityType: "partner", entityId: partnerId, partnerId };
  }

  return null;
}
