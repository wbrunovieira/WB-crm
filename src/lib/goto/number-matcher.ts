import { prisma } from "@/lib/prisma";

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
 * Gera variações do número para busca:
 * "+5571999998888" → ["5571999998888", "71999998888", "999998888"]
 * Cobre: com código país, só DDD+número, só número local
 */
function phoneVariations(phone: string): string[] {
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

function buildPhoneOrCondition(variations: string[]) {
  return variations.flatMap((v) => [
    { phone: { contains: v } },
    { whatsapp: { contains: v } },
  ]);
}

export async function matchPhoneToEntity(
  dialedNumber: string,
  ownerId: string
): Promise<MatchResult | null> {
  const variations = phoneVariations(dialedNumber);
  const orConditions = buildPhoneOrCondition(variations);

  // 1. Busca Contact
  const contact = await prisma.contact.findFirst({
    where: {
      ownerId,
      OR: orConditions,
    },
    select: { id: true },
  });

  if (contact) {
    return {
      entityType: "contact",
      entityId: contact.id,
      contactId: contact.id,
    };
  }

  // 2. Busca Lead
  const lead = await prisma.lead.findFirst({
    where: {
      ownerId,
      OR: orConditions,
    },
    select: { id: true },
  });

  if (lead) {
    return {
      entityType: "lead",
      entityId: lead.id,
      leadId: lead.id,
    };
  }

  // 3. Busca Partner
  const partner = await prisma.partner.findFirst({
    where: {
      ownerId,
      OR: orConditions,
    },
    select: { id: true },
  });

  if (partner) {
    return {
      entityType: "partner",
      entityId: partner.id,
      partnerId: partner.id,
    };
  }

  return null;
}
