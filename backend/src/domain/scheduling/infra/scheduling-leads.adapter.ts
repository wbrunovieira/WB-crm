import { Injectable } from "@nestjs/common";
import { LeadsRepository } from "@/domain/leads/application/repositories/leads.repository";
import { SchedulingLeadsPort, BookingLead } from "../application/ports/scheduling-leads.port";

@Injectable()
export class SchedulingLeadsAdapter extends SchedulingLeadsPort {
  constructor(private readonly leads: LeadsRepository) { super(); }

  async findForBooking(leadId: string): Promise<BookingLead | null> {
    const l = await this.leads.findByIdRaw(leadId);
    if (!l) return null;
    return {
      id: l.id.toString(),
      name: l.businessName,
      email: l.email ?? null,
      city: l.city ?? null,
      state: l.state ?? null,
      address: l.address ?? null,
    };
  }
}
