import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { BookingLinksAdminRepository, CreateBookingLinkData } from "../../application/repositories/booking-links-admin.repository";
import { BookingLinkRecord } from "../../application/repositories/booking-links.repository";

@Injectable()
export class PrismaBookingLinksAdminRepository extends BookingLinksAdminRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async create(d: CreateBookingLinkData): Promise<BookingLinkRecord> {
    const r = await this.prisma.bookingLink.create({
      data: { token: d.token, ownerId: d.ownerId, bookingTypeId: d.bookingTypeId, leadId: d.leadId ?? null, contactId: d.contactId ?? null, partnerId: d.partnerId ?? null, label: d.label ?? null },
    });
    return { id: r.id, token: r.token, ownerId: r.ownerId, bookingTypeId: r.bookingTypeId, leadId: r.leadId, contactId: r.contactId, partnerId: r.partnerId, label: r.label, active: r.active, expiresAt: r.expiresAt };
  }
}
