import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingSchedulerPort } from "../ports/meeting-scheduler.port";
import { BookingLinksRepository } from "../repositories/booking-links.repository";
import { BookingTypesRepository } from "../repositories/booking-types.repository";
import { CalendarFreeBusyPort } from "../ports/calendar-freebusy.port";
import { computeAvailableSlots } from "../../enterprise/services/availability.service";
import { curateSlots } from "../../enterprise/services/slot-curation.service";
import { BookingError } from "./slot-check.helper";

const DAY = 86_400_000;

export interface ManageInfoResult {
  status: string;
  currentStartAt: string;
  bookingType: { name: string; timeZone: string; durationMinutes: number } | null;
  slots: { start: string; end: string }[];
}

/** Dados para a página de gerenciar (remarcar/cancelar) a partir do manageToken. */
@Injectable()
export class GetBookingManageInfoUseCase {
  constructor(
    private readonly scheduler: MeetingSchedulerPort,
    private readonly links: BookingLinksRepository,
    private readonly types: BookingTypesRepository,
    private readonly freebusy: CalendarFreeBusyPort,
  ) {}

  async execute(input: { manageToken: string; now?: Date }): Promise<Either<BookingError, ManageInfoResult>> {
    const now = input.now ?? new Date();
    const ref = await this.scheduler.findByManageToken(input.manageToken);
    if (!ref) return left(new BookingError("Agendamento não encontrado"));

    const base: ManageInfoResult = { status: ref.status, currentStartAt: ref.startAt.toISOString(), bookingType: null, slots: [] };
    if (ref.status === "cancelled" || !ref.bookingLinkId) return right(base);

    const link = await this.links.findById(ref.bookingLinkId);
    const type = link ? await this.types.findById(link.bookingTypeId) : null;
    if (!type) return right(base);

    const windowStart = new Date(now.getTime() + type.minNoticeHours * 3600_000);
    const windowEnd = new Date(now.getTime() + type.maxAdvanceDays * DAY);
    const busy = await this.freebusy.getBusy(link!.ownerId, windowStart, windowEnd);
    const allSlots = computeAvailableSlots({
      now, timeZone: type.timeZone, weeklyHours: type.weeklyHours,
      slotMinutes: type.durationMinutes, bufferMinutes: type.bufferMinutes,
      minNoticeHours: type.minNoticeHours, maxAdvanceDays: type.maxAdvanceDays, busy,
    });
    const slots = curateSlots(allSlots, { maxPerTurno: 3, timeZone: type.timeZone });

    return right({
      ...base,
      bookingType: { name: type.name, timeZone: type.timeZone, durationMinutes: type.durationMinutes },
      slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
    });
  }
}
