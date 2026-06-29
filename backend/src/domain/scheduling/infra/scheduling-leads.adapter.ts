import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { normalizePhoneE164 } from "@/infra/shared/phone/phone-normalizer";
import { SchedulingLeadsPort, BookingLead } from "../application/ports/scheduling-leads.port";

type LeadRow = { id: string; businessName: string; email: string | null; city: string | null; state: string | null; address: string | null };
const toBookingLead = (l: LeadRow): BookingLead => ({
  id: l.id, name: l.businessName, email: l.email, city: l.city, state: l.state, address: l.address,
});

@Injectable()
export class SchedulingLeadsAdapter extends SchedulingLeadsPort {
  constructor(
    private readonly leads: LeadsRepository,
    private readonly prisma: PrismaService,
  ) { super(); }

  async findForBooking(leadId: string): Promise<BookingLead | null> {
    const l = await this.leads.findByIdRaw(leadId);
    if (!l) return null;
    return { id: l.id.toString(), name: l.businessName, email: l.email ?? null, city: l.city ?? null, state: l.state ?? null, address: l.address ?? null };
  }

  async findByContact(input: { ownerId: string; email?: string; whatsapp?: string }): Promise<BookingLead | null> {
    const or: Array<Record<string, string>> = [];
    if (input.email?.trim()) or.push({ email: input.email.trim() });
    const wa = normalizePhoneE164(input.whatsapp);
    if (wa) { or.push({ whatsapp: wa }); or.push({ phone: wa }); }
    if (or.length === 0) return null;
    const l = await this.prisma.lead.findFirst({ where: { ownerId: input.ownerId, OR: or } });
    return l ? toBookingLead(l) : null;
  }

  async createLead(input: { ownerId: string; name: string; email?: string; whatsapp?: string }): Promise<BookingLead> {
    const l = await this.prisma.lead.create({
      data: {
        ownerId: input.ownerId,
        businessName: input.name,
        email: input.email?.trim() || null,
        whatsapp: normalizePhoneE164(input.whatsapp),
        isProspect: false,
        source: "self_booking",
        status: "new",
      },
    });
    return toBookingLead(l);
  }

  async confirmLeadEmail(leadId: string, email: string): Promise<void> {
    // só preenche se o lead ainda não tinha e-mail próprio (não sobrescreve)
    await this.prisma.lead.updateMany({ where: { id: leadId, email: null }, data: { email: email.trim() } });
  }
}
