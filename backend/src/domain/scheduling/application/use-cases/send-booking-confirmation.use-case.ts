import { Injectable, Optional, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { getBrandConfig } from "@/domain/integrations/meet/application/helpers/brand-email.helper";
import {
  buildBookingConfirmationEmail,
  bookingConfirmationSubject,
  BookingLang,
} from "../../infra/email-templates/booking-confirmation.template";

const GMAIL_USER = "google-token-singleton";
const VALID_LANGS: BookingLang[] = ["pt", "en", "es", "it"];

export interface SendBookingConfirmationInput {
  attendeeEmail: string;
  attendeeName: string;
  title: string;
  startAtISO: string;
  endAtISO: string;
  attendeeTimeZone: string;
  lang: string;
  meetLink: string | null;
  location: string | null;
}

/**
 * Sends the lead a branded confirmation email (on top of Google's native invite),
 * in the language they booked in. Non-fatal — the booking is already done.
 */
@Injectable()
export class SendBookingConfirmationUseCase {
  private readonly logger = new Logger(SendBookingConfirmationUseCase.name);

  constructor(@Optional() private readonly gmail?: GmailPort) {}

  async execute(input: SendBookingConfirmationInput): Promise<Either<Error, { sent: boolean }>> {
    if (!this.gmail || !input.attendeeEmail) return right({ sent: false });

    const lang: BookingLang = VALID_LANGS.includes(input.lang as BookingLang) ? (input.lang as BookingLang) : "pt";
    const brand = getBrandConfig("contato@wbdigitalsolutions.com"); // WB brand

    try {
      await this.gmail.send({
        userId: GMAIL_USER,
        to: input.attendeeEmail,
        subject: bookingConfirmationSubject(lang, input.title),
        bodyHtml: buildBookingConfirmationEmail({
          lang,
          brand,
          attendeeName: input.attendeeName,
          title: input.title,
          startAt: new Date(input.startAtISO),
          endAt: new Date(input.endAtISO),
          timeZone: input.attendeeTimeZone,
          meetLink: input.meetLink,
          location: input.location,
        }),
      });
      return right({ sent: true });
    } catch (err) {
      this.logger.warn(
        `Falha ao enviar confirmação ao lead (${input.attendeeEmail}): ${err instanceof Error ? err.message : String(err)}`,
      );
      return right({ sent: false });
    }
  }
}
