import { BookingTypeRecord } from "../repositories/booking-types.repository";
import { CalendarFreeBusyPort } from "../ports/calendar-freebusy.port";
import { computeAvailableSlots } from "../../enterprise/services/availability.service";

const DAY = 86_400_000;

/** Recalcula a disponibilidade e confirma que `startAt` é um slot livre (anti race / link velho). */
export async function requestedSlotAvailable(
  type: BookingTypeRecord,
  now: Date,
  freebusy: CalendarFreeBusyPort,
  ownerId: string,
  startAt: Date,
): Promise<boolean> {
  const windowStart = new Date(now.getTime() + type.minNoticeHours * 3600_000);
  const windowEnd = new Date(now.getTime() + type.maxAdvanceDays * DAY);
  const busy = await freebusy.getBusy(ownerId, windowStart, windowEnd);
  const slots = computeAvailableSlots({
    now,
    timeZone: type.timeZone,
    weeklyHours: type.weeklyHours,
    slotMinutes: type.durationMinutes,
    bufferMinutes: type.bufferMinutes,
    minNoticeHours: type.minNoticeHours,
    maxAdvanceDays: type.maxAdvanceDays,
    busy,
  });
  return slots.some((s) => s.start.getTime() === startAt.getTime());
}

export class BookingError extends Error {
  constructor(message: string) { super(message); this.name = "BookingError"; }
}
