import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { BookingLinksRepository } from "../repositories/booking-links.repository";
import { BookingTypesRepository } from "../repositories/booking-types.repository";
import { CalendarFreeBusyPort } from "../ports/calendar-freebusy.port";
import { SchedulingLeadsPort } from "../ports/scheduling-leads.port";
import { computeAvailableSlots } from "../../enterprise/services/availability.service";
import { curateSlots } from "../../enterprise/services/slot-curation.service";
import { cityIsServed } from "../../enterprise/services/city-match";

/** Horários exibidos por turno (manhã/tarde) por dia — evita "agenda sempre vazia". */
const MAX_SLOTS_PER_TURNO = 3;

export class BookingLinkUnavailableError extends Error {
  constructor() { super("Link de agendamento inválido ou expirado"); this.name = "BookingLinkUnavailableError"; }
}

export interface GetAvailableSlotsResult {
  bookingType: { name: string; durationMinutes: number; timeZone: string };
  locationModes: ("online" | "presential")[];
  lead: { name: string; address: string | null; email: string | null } | null;
  slots: { start: string; end: string }[];
}

const DAY = 86_400_000;

@Injectable()
export class GetAvailableSlotsUseCase {
  constructor(
    private readonly links: BookingLinksRepository,
    private readonly types: BookingTypesRepository,
    private readonly freebusy: CalendarFreeBusyPort,
    private readonly leads: SchedulingLeadsPort,
  ) {}

  async execute(input: { token?: string; now?: Date }): Promise<Either<BookingLinkUnavailableError, GetAvailableSlotsResult>> {
    const now = input.now ?? new Date();

    // Empty token = the token-less /book URL → resolve the default public link.
    const link = input.token ? await this.links.findByToken(input.token) : await this.links.findDefaultPublic();
    if (!link || !link.active || (link.expiresAt && link.expiresAt < now)) {
      return left(new BookingLinkUnavailableError());
    }

    const type = await this.types.findById(link.bookingTypeId);
    if (!type || !type.active) return left(new BookingLinkUnavailableError());

    const windowStart = new Date(now.getTime() + type.minNoticeHours * 3600_000);
    const windowEnd = new Date(now.getTime() + type.maxAdvanceDays * DAY);
    const busy = await this.freebusy.getBusy(link.ownerId, windowStart, windowEnd);

    const allSlots = computeAvailableSlots({
      now,
      timeZone: type.timeZone,
      weeklyHours: type.weeklyHours,
      slotMinutes: type.durationMinutes,
      bufferMinutes: type.bufferMinutes,
      minNoticeHours: type.minNoticeHours,
      maxAdvanceDays: type.maxAdvanceDays,
      busy,
    });
    const slots = curateSlots(allSlots, { maxPerTurno: MAX_SLOTS_PER_TURNO, timeZone: type.timeZone });

    // Entidade do link: lead OU partner (mesmo formato de exibição).
    const entity = link.leadId
      ? await this.leads.findForBooking(link.leadId)
      : link.partnerId
        ? await this.leads.findPartnerForBooking(link.partnerId)
        : null;

    const locationModes: ("online" | "presential")[] = ["online"];
    if (cityIsServed(entity?.city, type.presentialCities)) {
      locationModes.push("presential");
    }

    return right({
      bookingType: { name: type.name, durationMinutes: type.durationMinutes, timeZone: type.timeZone },
      locationModes,
      lead: entity ? { name: entity.name, address: entity.address, email: entity.email } : null,
      slots: slots.map((s) => ({ start: s.start.toISOString(), end: s.end.toISOString() })),
    });
  }
}
