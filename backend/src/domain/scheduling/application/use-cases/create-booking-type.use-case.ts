import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BookingTypesAdminRepository } from "../repositories/booking-types-admin.repository";
import { BookingTypeRecord } from "../repositories/booking-types.repository";

export class SchedulingAdminError extends Error {
  constructor(message: string) { super(message); this.name = "SchedulingAdminError"; }
}

export function slugify(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-{2,}/g, "-").replace(/^-|-$/g, "");
}

interface WeeklyWindow { weekday: number; start: string; end: string }
interface PresentialCity { city: string; state?: string }

@Injectable()
export class CreateBookingTypeUseCase {
  constructor(private readonly repo: BookingTypesAdminRepository) {}

  async execute(input: {
    ownerId: string;
    name: string;
    weeklyHours: WeeklyWindow[];
    presentialCities?: PresentialCity[];
    durationMinutes?: number;
    bufferMinutes?: number;
    minNoticeHours?: number;
    maxAdvanceDays?: number;
    timeZone?: string;
    slug?: string;
  }): Promise<Either<SchedulingAdminError, { bookingType: BookingTypeRecord }>> {
    const name = input.name.trim();
    if (!name) return left(new SchedulingAdminError("Nome é obrigatório"));

    const bookingType = await this.repo.create({
      ownerId: input.ownerId,
      name,
      slug: input.slug?.trim() || slugify(name),
      durationMinutes: input.durationMinutes ?? 30,
      bufferMinutes: input.bufferMinutes ?? 15,
      minNoticeHours: input.minNoticeHours ?? 4,
      maxAdvanceDays: input.maxAdvanceDays ?? 14,
      timeZone: input.timeZone ?? "America/Sao_Paulo",
      weeklyHours: input.weeklyHours,
      presentialCities: input.presentialCities ?? [],
      active: true,
    });
    return right({ bookingType });
  }
}
