import { prisma } from "@/lib/prisma";

export interface MatchResult {
  entityType: "contact" | "lead" | "partner";
  entityId: string;
  contactId?: string;
  leadId?: string;
  partnerId?: string;
}

/**
 * Extrai número de telefone de um JID do WhatsApp.
 * "5511999998888@s.whatsapp.net" → "5511999998888"
 */
export function extractPhoneFromJid(remoteJid: string): string {
  return remoteJid.replace(/@.*$/, "");
}

/**
 * Verifica se o JID pertence a um grupo (@g.us).
 * Mensagens de grupo são ignoradas pelo CRM.
 */
export function isGroupJid(remoteJid: string): boolean {
  return remoteJid.endsWith("@g.us");
}

/**
 * Gera variações digit-only do número para busca no banco.
 * Cobre: com código país (55), com DDD, só número local.
 */
export function phoneVariations(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
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

  // Remove DDD se tiver 10-11 dígitos
  if (digits.length === 11 || digits.length === 10) {
    variations.add(digits.slice(2));
  }

  // Adiciona prefixo 55 se não tiver
  if (!digits.startsWith("55") && digits.length >= 10) {
    variations.add("55" + digits);
  }

  return Array.from(variations).filter((v) => v.length >= 8);
}

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

/**
 * Busca Lead por phone OU whatsapp (diferença do GoTo matcher que usa só phone).
 * WhatsApp é identificado pelo campo whatsapp, não necessariamente pelo phone.
 */
async function findLeadByPhone(
  variations: string[],
  ownerId: string
): Promise<string | null> {
  const result = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM leads
    WHERE "ownerId" = ${ownerId}
      AND (
        regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
        OR regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
      )
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
  phone: string,
  ownerId: string
): Promise<MatchResult | null> {
  const variations = phoneVariations(phone);

  const contactId = await findContactByPhone(variations, ownerId);
  if (contactId) {
    return { entityType: "contact", entityId: contactId, contactId };
  }

  const leadId = await findLeadByPhone(variations, ownerId);
  if (leadId) {
    return { entityType: "lead", entityId: leadId, leadId };
  }

  const partnerId = await findPartnerByPhone(variations, ownerId);
  if (partnerId) {
    return { entityType: "partner", entityId: partnerId, partnerId };
  }

  return null;
}
