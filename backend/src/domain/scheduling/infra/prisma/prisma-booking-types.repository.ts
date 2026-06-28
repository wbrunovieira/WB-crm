import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { BookingTypesRepository, BookingTypeRecord } from "../../application/repositories/booking-types.repository";

function safeParse<T>(s: string, fallback: T): T { try { return JSON.parse(s) as T; } catch { return fallback; } }

@Injectable()
export class PrismaBookingTypesRepository extends BookingTypesRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async findById(id: string): Promise<BookingTypeRecord | null> {
    const r = await this.prisma.bookingType.findUnique({ where: { id } });
    if (!r) return null;
    return {
      id: r.id, ownerId: r.ownerId, name: r.name, slug: r.slug,
      durationMinutes: r.durationMinutes, bufferMinutes: r.bufferMinutes,
      minNoticeHours: r.minNoticeHours, maxAdvanceDays: r.maxAdvanceDays,
      timeZone: r.timeZone,
      weeklyHours: safeParse(r.weeklyHours, []),
      presentialCities: safeParse(r.presentialCities, []),
      active: r.active,
    };
  }
}
