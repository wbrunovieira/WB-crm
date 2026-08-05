import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";
import { LeadDuplicatesRepository, DuplicateCheckInput, DuplicateMatch } from "../../application/repositories/lead-duplicates.repository";

@Injectable()
export class PrismaLeadDuplicatesRepository extends LeadDuplicatesRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findDuplicates(input: DuplicateCheckInput): Promise<DuplicateMatch[]> {
    const orConditions: object[] = [];
    // Stored phones are E.164 (see phone-normalizer.ts); callers (mobile, web forms) may send
    // a bare national number — normalize before comparing or the exact-match below silently
    // misses a real duplicate typed in a different format than what's on file.
    const phone = normalizePhoneE164(input.phone);

    if (input.cnpj) orConditions.push({ companyRegistrationID: input.cnpj });
    if (phone) orConditions.push({ phone });
    if (input.email) orConditions.push({ email: { equals: input.email, mode: "insensitive" } });
    if (input.name) {
      // forward: existing name contains input query
      orConditions.push({ businessName: { contains: input.name, mode: "insensitive" } });
      // word-by-word: each significant word from input as a separate contains condition
      // catches reverse case where "teste" matches input "teste para reuniao"
      const words = input.name.split(/\s+/).filter((w) => w.length >= 4);
      for (const word of words) {
        orConditions.push({ businessName: { contains: word, mode: "insensitive" } });
      }
    }
    if (input.address) orConditions.push({ address: { contains: input.address, mode: "insensitive" } });

    if (orConditions.length === 0) return [];

    const rows = await this.prisma.lead.findMany({
      where: { ownerId: input.ownerId, isProspect: false, OR: orConditions },
      select: { id: true, businessName: true, companyRegistrationID: true, phone: true, email: true, address: true, city: true, state: true, isArchived: true, status: true },
    });

    return rows.map((r) => {
      const matched: string[] = [];
      if (input.cnpj && r.companyRegistrationID === input.cnpj) matched.push("cnpj");
      if (phone && r.phone === phone) matched.push("phone");
      if (input.email && r.email?.toLowerCase() === input.email.toLowerCase()) matched.push("email");
      if (input.name) {
        const existingLower = r.businessName.toLowerCase();
        const inputLower = input.name.toLowerCase();
        const fullMatch = existingLower.includes(inputLower) || inputLower.includes(existingLower);
        const words = input.name.split(/\s+/).filter((w) => w.length >= 4);
        const wordMatch = words.some((w) => existingLower.includes(w.toLowerCase()));
        if (fullMatch || wordMatch) matched.push("name");
      }
      if (input.address && r.address?.toLowerCase().includes(input.address.toLowerCase())) matched.push("address");
      return {
        leadId: r.id, businessName: r.businessName,
        companyRegistrationID: r.companyRegistrationID, phone: r.phone, email: r.email,
        city: r.city, state: r.state, isArchived: r.isArchived, status: r.status,
        matchedFields: matched, score: matched.length * 25,
      };
    }).sort((a, b) => b.score - a.score);
  }
}
