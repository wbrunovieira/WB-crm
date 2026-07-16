import { Injectable, Optional, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { UsersRepository } from "@/domain/auth/application/repositories/users.repository";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

const GMAIL_USER = "google-token-singleton";

/** Escape HTML so an attendee-typed name can't inject markup into the email body. */
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
/** Strip CR/LF so the name can't inject extra email headers via the subject. */
function sanitizeSubject(s: string): string {
  return s.replace(/[\r\n]+/g, " ").trim();
}

export interface NotifyHostBookingInput {
  ownerId: string; // link owner = host to notify
  attendeeName: string;
  attendeeEmail: string;
  attendeeWhatsapp: string | null;
  startAtISO: string;
  timeZone: string;
  meetingId: string;
  meetLink: string | null;
  mode: "online" | "presential";
}

/**
 * Alerts the host (booking link owner) via the in-app bell AND an email when
 * someone books through a public link. Google Calendar never emails the event
 * organizer, so this is the host's only email heads-up. The bell always fires;
 * the email only when the owner has a resolvable address.
 */
@Injectable()
export class NotifyHostBookingUseCase {
  private readonly logger = new Logger(NotifyHostBookingUseCase.name);

  constructor(
    private readonly createNotification: CreateNotificationUseCase,
    private readonly users: UsersRepository,
    @Optional() private readonly gmail?: GmailPort,
  ) {}

  async execute(input: NotifyHostBookingInput): Promise<Either<Error, { notified: boolean }>> {
    const when = this.formatWhen(input.startAtISO, input.timeZone);
    const modeLabel = input.mode === "presential" ? "presencial" : "online";

    // In-app bell — independent of the email so one failing doesn't skip the other.
    try {
      await this.createNotification.execute({
        type: "BOOKING_CREATED",
        title: `Nova reunião agendada: ${input.attendeeName}`,
        summary: `${input.attendeeName} agendou uma reunião ${modeLabel} para ${when}. Nome, e-mail e telefone estão no e-mail que enviamos a você.`,
        userId: input.ownerId,
        payload: JSON.stringify({ meetingId: input.meetingId }),
      });
    } catch (err) {
      this.logger.warn(
        `Falha ao criar sino de novo agendamento (${input.meetingId}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Email to the host (non-fatal; needs a resolvable address)
    if (this.gmail) {
      try {
        const owner = await this.users.findById(input.ownerId);
        if (owner?.email) {
          await this.gmail.send({
            userId: GMAIL_USER,
            to: owner.email,
            subject: sanitizeSubject(`Nova reunião agendada: ${input.attendeeName}`),
            bodyHtml: this.buildEmail(input, when, modeLabel),
          });
        }
      } catch (err) {
        this.logger.warn(
          `Falha ao enviar e-mail de novo agendamento (${input.meetingId}): ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    return right({ notified: true });
  }

  private formatWhen(iso: string, timeZone: string): string {
    try {
      return new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "full", timeStyle: "short" }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  private buildEmail(input: NotifyHostBookingInput, when: string, modeLabel: string): string {
    const safeName = escapeHtml(input.attendeeName);
    const link = input.meetLink
      ? `<p><a href="${escapeHtml(input.meetLink)}" style="display:inline-block;background:#792990;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Abrir o Google Meet</a></p>`
      : "";
    const phone = input.attendeeWhatsapp ? escapeHtml(input.attendeeWhatsapp) : "—";
    const row = (label: string, value: string) =>
      `<tr><td style="padding:6px 12px;color:#666;font-size:13px;border-bottom:1px solid #eee">${label}</td><td style="padding:6px 12px;font-size:14px;border-bottom:1px solid #eee"><strong>${value}</strong></td></tr>`;
    return `
      <div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#792990">Nova reunião agendada</h2>
        <p><strong>${safeName}</strong> agendou uma reunião <strong>${escapeHtml(modeLabel)}</strong>.</p>
        <p style="font-size:16px">🗓️ ${escapeHtml(when)}</p>
        <table style="width:100%;border-collapse:collapse;margin:12px 0">
          ${row("Nome", safeName)}
          ${row("E-mail", escapeHtml(input.attendeeEmail))}
          ${row("Telefone", phone)}
        </table>
        ${link}
        <p style="color:#666;font-size:13px">O evento também já está na sua Google Agenda.</p>
      </div>`;
  }
}
