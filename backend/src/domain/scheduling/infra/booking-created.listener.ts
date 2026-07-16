import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { BookingCreatedEvent, BOOKING_CREATED_EVENT } from "../enterprise/events/booking-created.event";
import { NotifyHostBookingUseCase } from "../application/use-cases/notify-host-booking.use-case";

@Injectable()
export class BookingCreatedListener {
  private readonly logger = new Logger(BookingCreatedListener.name);

  constructor(private readonly notify: NotifyHostBookingUseCase) {}

  @OnEvent(BOOKING_CREATED_EVENT)
  async handle(event: BookingCreatedEvent): Promise<void> {
    try {
      await this.notify.execute(event.payload);
    } catch (err) {
      this.logger.warn(
        `Falha ao notificar host do agendamento (${event.payload.meetingId}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
