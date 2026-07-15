import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { BookingLinksRepository, BookingLinkRecord } from "../../application/repositories/booking-links.repository";

type Row = {
  id: string; token: string; ownerId: string; bookingTypeId: string;
  leadId: string | null; contactId: string | null; partnerId: string | null; label: string | null;
  active: boolean; expiresAt: Date | null;
};
const toRecord = (r: Row): BookingLinkRecord => ({
  id: r.id, token: r.token, ownerId: r.ownerId, bookingTypeId: r.bookingTypeId,
  leadId: r.leadId, contactId: r.contactId, partnerId: r.partnerId, label: r.label, active: r.active, expiresAt: r.expiresAt,
});

@Injectable()
export class PrismaBookingLinksRepository extends BookingLinksRepository {
  constructor(private readonly prisma: PrismaService) { super(); }
  async findByToken(token: string): Promise<BookingLinkRecord | null> {
    const r = await this.prisma.bookingLink.findUnique({ where: { token } });
    return r ? toRecord(r) : null;
  }
  async findById(id: string): Promise<BookingLinkRecord | null> {
    const r = await this.prisma.bookingLink.findUnique({ where: { id } });
    return r ? toRecord(r) : null;
  }
  async findDefaultPublic(): Promise<BookingLinkRecord | null> {
    // A partial unique index guarantees at most one default; orderBy is a
    // deterministic tiebreaker so slots (GET) and create (POST) can't diverge.
    const r = await this.prisma.bookingLink.findFirst({
      where: { isDefaultPublic: true, active: true },
      orderBy: { createdAt: "asc" },
    });
    return r ? toRecord(r) : null;
  }
}
