import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BookingLinksRepository } from "../repositories/booking-links.repository";
import { BookingTypesRepository } from "../repositories/booking-types.repository";
import { CalendarFreeBusyPort } from "../ports/calendar-freebusy.port";
import { MeetingSchedulerPort } from "../ports/meeting-scheduler.port";
import { requestedSlotAvailable, BookingError } from "./slot-check.helper";

export interface RescheduleResult { meetingId: string; startAt: string; endAt: string; }

@Injectable()
export class RescheduleBookingUseCase {
  constructor(
    private readonly links: BookingLinksRepository,
    private readonly types: BookingTypesRepository,
    private readonly freebusy: CalendarFreeBusyPort,
    private readonly scheduler: MeetingSchedulerPort,
  ) {}

  async execute(input: { manageToken: string; startISO: string; now?: Date }): Promise<Either<BookingError, RescheduleResult>> {
    const now = input.now ?? new Date();

    const meeting = await this.scheduler.findByManageToken(input.manageToken);
    if (!meeting || meeting.status === "cancelled") return left(new BookingError("Agendamento não encontrado"));
    if (!meeting.bookingLinkId) return left(new BookingError("Agendamento sem link de origem"));

    const link = await this.links.findById(meeting.bookingLinkId);
    if (!link) return left(new BookingError("Link de origem não encontrado"));
    const type = await this.types.findById(link.bookingTypeId);
    if (!type) return left(new BookingError("Tipo de agendamento não encontrado"));

    const startAt = new Date(input.startISO);
    if (isNaN(startAt.getTime())) return left(new BookingError("Horário inválido"));
    if (!(await requestedSlotAvailable(type, now, this.freebusy, link.ownerId, startAt))) {
      return left(new BookingError("Horário não está disponível"));
    }

    const endAt = new Date(startAt.getTime() + type.durationMinutes * 60_000);
    await this.scheduler.reschedule(meeting.meetingId, startAt, endAt);

    return right({ meetingId: meeting.meetingId, startAt: startAt.toISOString(), endAt: endAt.toISOString() });
  }
}
