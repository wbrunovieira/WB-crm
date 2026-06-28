import { Injectable } from "@nestjs/common";
import { PrismaService } from "@/infra/database/prisma.service";
import { BookingTypesAdminRepository, CreateBookingTypeData, UpdateBookingTypeData } from "../../application/repositories/booking-types-admin.repository";
import { BookingTypeRecord } from "../../application/repositories/booking-types.repository";

function parse<T>(s: string, fb: T): T { try { return JSON.parse(s) as T; } catch { return fb; } }
function toRecord(r: any): BookingTypeRecord {
  return {
    id: r.id, ownerId: r.ownerId, name: r.name, slug: r.slug,
    durationMinutes: r.durationMinutes, bufferMinutes: r.bufferMinutes,
    minNoticeHours: r.minNoticeHours, maxAdvanceDays: r.maxAdvanceDays, timeZone: r.timeZone,
    weeklyHours: parse(r.weeklyHours, []), presentialCities: parse(r.presentialCities, []), active: r.active,
  };
}

@Injectable()
export class PrismaBookingTypesAdminRepository extends BookingTypesAdminRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async create(d: CreateBookingTypeData): Promise<BookingTypeRecord> {
    const r = await this.prisma.bookingType.create({
      data: {
        ownerId: d.ownerId, name: d.name, slug: d.slug,
        durationMinutes: d.durationMinutes, bufferMinutes: d.bufferMinutes,
        minNoticeHours: d.minNoticeHours, maxAdvanceDays: d.maxAdvanceDays, timeZone: d.timeZone,
        weeklyHours: JSON.stringify(d.weeklyHours), presentialCities: JSON.stringify(d.presentialCities), active: d.active,
      },
    });
    return toRecord(r);
  }

  async update(id: string, d: UpdateBookingTypeData): Promise<BookingTypeRecord> {
    const r = await this.prisma.bookingType.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.durationMinutes !== undefined ? { durationMinutes: d.durationMinutes } : {}),
        ...(d.bufferMinutes !== undefined ? { bufferMinutes: d.bufferMinutes } : {}),
        ...(d.minNoticeHours !== undefined ? { minNoticeHours: d.minNoticeHours } : {}),
        ...(d.maxAdvanceDays !== undefined ? { maxAdvanceDays: d.maxAdvanceDays } : {}),
        ...(d.timeZone !== undefined ? { timeZone: d.timeZone } : {}),
        ...(d.weeklyHours !== undefined ? { weeklyHours: JSON.stringify(d.weeklyHours) } : {}),
        ...(d.presentialCities !== undefined ? { presentialCities: JSON.stringify(d.presentialCities) } : {}),
        ...(d.active !== undefined ? { active: d.active } : {}),
      },
    });
    return toRecord(r);
  }

  async listByOwner(ownerId: string): Promise<BookingTypeRecord[]> {
    const rows = await this.prisma.bookingType.findMany({ where: { ownerId }, orderBy: { createdAt: "desc" } });
    return rows.map(toRecord);
  }
}
