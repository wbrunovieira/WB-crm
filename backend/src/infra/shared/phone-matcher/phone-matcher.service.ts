import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";

export interface PhoneMatchResult {
  entityType: "contact" | "lead" | "partner";
  contactId?: string;
  leadId?: string;
  partnerId?: string;
}

/**
 * Generates digit-only variants of a phone number for DB matching.
 * "+5571999998888" → ["5571999998888", "71999998888", "999998888"]
 * Covers: with country code, DDD+number, local number only
 */
export function phoneVariations(phone: string): string[] {
  const digits = phone.replace(/\D/g, "");
  const variations = new Set<string>();

  variations.add(digits);

  // Remove Brazilian country code (55) if present
  if (digits.startsWith("55") && digits.length >= 12) {
    const withoutCountry = digits.slice(2);
    variations.add(withoutCountry);

    // Remove DDD (2 digits) for local number
    if (withoutCountry.length >= 10) {
      variations.add(withoutCountry.slice(2));
    }
  }

  // Remove DDD if 10-11 digits (DDD + number)
  if (digits.length === 11 || digits.length === 10) {
    variations.add(digits.slice(2));
  }

  // Add 55 prefix if missing
  if (!digits.startsWith("55") && digits.length >= 10) {
    variations.add("55" + digits);
  }

  return Array.from(variations).filter((v) => v.length >= 8);
}

export abstract class IPhoneMatcherService {
  abstract match(phone: string, ownerId: string): Promise<PhoneMatchResult | null>;
}

@Injectable()
export class PhoneMatcherService extends IPhoneMatcherService {
  constructor(private readonly prisma: PrismaService) { super(); }

  async match(phone: string, ownerId: string): Promise<PhoneMatchResult | null> {
    const variations = phoneVariations(phone);

    // 1. Search Contact
    const contactRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM contacts
      WHERE "ownerId" = ${ownerId}
        AND (
          regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
          OR regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
        )
      LIMIT 1
    `;

    if (contactRows[0]) {
      const contactId = contactRows[0].id;
      // Check contact's org is not in operations
      const contactCheck = await this.prisma.contact.findFirst({
        where: {
          id: contactId,
          OR: [{ organizationId: null }, { organization: { inOperationsAt: null } }],
        },
        select: { id: true },
      });
      if (contactCheck) {
        return { entityType: "contact", contactId };
      }
      return null;
    }

    // 2. Search Lead
    const leadRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM leads
      WHERE "ownerId" = ${ownerId}
        AND (
          regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
          OR regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
        )
      LIMIT 1
    `;

    let leadId: string | undefined = leadRows[0]?.id;

    if (!leadId) {
      // Also search in lead_contacts
      const lcRows = await this.prisma.$queryRaw<Array<{ leadId: string }>>`
        SELECT lc."leadId" FROM lead_contacts lc
        JOIN leads l ON l.id = lc."leadId"
        WHERE l."ownerId" = ${ownerId}
          AND (
            regexp_replace(COALESCE(lc.phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
            OR regexp_replace(COALESCE(lc.whatsapp, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
          )
        LIMIT 1
      `;
      leadId = lcRows[0]?.leadId;
    }

    if (leadId) {
      // Check lead is not in operations
      const leadCheck = await this.prisma.lead.findFirst({
        where: { id: leadId, inOperationsAt: null },
        select: { id: true },
      });
      if (leadCheck) {
        return { entityType: "lead", leadId };
      }
      return null;
    }

    // 3. Search Partner
    const partnerRows = await this.prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM partners
      WHERE "ownerId" = ${ownerId}
        AND (
          regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
          OR regexp_replace(COALESCE(whatsapp, ''), '[^0-9]', '', 'g') = ANY(${variations}::text[])
        )
      LIMIT 1
    `;

    if (partnerRows[0]) {
      return { entityType: "partner", partnerId: partnerRows[0].id };
    }

    return null;
  }
}
