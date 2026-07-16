import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BookingCreatedEvent, BOOKING_CREATED_EVENT } from "../enterprise/events/booking-created.event";
import { NotifyHostBookingUseCase } from "../application/use-cases/notify-host-booking.use-case";
import { SendBookingConfirmationUseCase } from "../application/use-cases/send-booking-confirmation.use-case";

@Injectable()
export class BookingCreatedListener {
  private readonly logger = new Logger(BookingCreatedListener.name);

  constructor(
    private readonly notifyHost: NotifyHostBookingUseCase,
    private readonly confirmAttendee: SendBookingConfirmationUseCase,
  ) {}

  @OnEvent(BOOKING_CREATED_EVENT)
  async handle(event: BookingCreatedEvent): Promise<void> {
    const p = event.payload;
    // Host alert (bell + email with the lead's name/email/phone)
    try {
      await this.notifyHost.execute({
        ownerId: p.ownerId,
        attendeeName: p.attendeeName,
        attendeeEmail: p.attendeeEmail,
        attendeeWhatsapp: p.attendeeWhatsapp,
        startAtISO: p.startAtISO,
        timeZone: p.timeZone,
        meetingId: p.meetingId,
        meetLink: p.meetLink,
        mode: p.mode,
      });
    } catch (err) {
      this.logger.warn(`Falha ao notificar host (${p.meetingId}): ${err instanceof Error ? err.message : String(err)}`);
    }
    // Branded confirmation to the lead, in the language they booked in
    try {
      await this.confirmAttendee.execute({
        attendeeEmail: p.attendeeEmail,
        attendeeName: p.attendeeName,
        title: p.title,
        startAtISO: p.startAtISO,
        endAtISO: p.endAtISO,
        attendeeTimeZone: p.attendeeTimeZone,
        lang: p.lang,
        meetLink: p.meetLink,
        location: p.location,
      });
    } catch (err) {
      this.logger.warn(`Falha ao confirmar lead (${p.meetingId}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
