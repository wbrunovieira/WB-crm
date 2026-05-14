import { Injectable, Logger, Optional, Inject } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository } from "../repositories/meetings.repository";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { MeetingNotFoundError, MeetingForbiddenError } from "./meetings-crud.use-cases";
import { getBrandConfig, buildBrandedEmail } from "../helpers/brand-email.helper";

export interface ResendMeetingConfirmationInput {
  id: string;
  requesterId: string;
  organizerEmail?: string;
}

@Injectable()
export class ResendMeetingConfirmationUseCase {
  private readonly logger = new Logger(ResendMeetingConfirmationUseCase.name);

  constructor(
    private readonly repo: MeetingsRepository,
    @Optional() @Inject(GmailPort) private readonly gmail: GmailPort | null,
  ) {}

  async execute(input: ResendMeetingConfirmationInput): Promise<Either<Error, void>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));

    if (!this.gmail) return right(undefined);

    const raw = meeting.attendeeEmails;
    const parsed: unknown[] = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown[]) ?? [];
    const attendeeEmails = parsed.map((a) =>
      typeof a === "string" ? a : (a as { email: string }).email,
    );

    if (attendeeEmails.length === 0) return right(undefined);

    let primaryEmail = input.organizerEmail ?? (meeting.organizerEmail ?? "");
    try {
      const profile = await this.gmail.getProfile("google-token-singleton");
      primaryEmail = primaryEmail || profile.emailAddress;
    } catch { /* non-fatal */ }

    const effectiveOrganizer = input.organizerEmail ?? meeting.organizerEmail ?? primaryEmail;
    const brand = getBrandConfig(effectiveOrganizer);
    const endAt = meeting.endAt ?? new Date(meeting.startAt.getTime() + 60 * 60 * 1000);

    const { contactName, companyName } = await this.repo.findRelatedNames(input.id);

    const bodyHtml = buildBrandedEmail({
      brand,
      title: meeting.title,
      startAt: meeting.startAt,
      endAt,
      location: meeting.location ?? undefined,
      meetLink: meeting.meetLink ?? undefined,
      organizerEmail: effectiveOrganizer,
      contactName,
      companyName,
    });

    for (const email of attendeeEmails) {
      try {
        await this.gmail.sendCalendarInvite({
          userId: "google-token-singleton",
          to: email,
          from: primaryEmail || effectiveOrganizer,
          organizerEmail: effectiveOrganizer,
          attendeeEmails: [email],
          subject: `Reunião agendada: ${meeting.title}`,
          bodyHtml,
          startAt: meeting.startAt,
          endAt,
          title: meeting.title,
          location: meeting.location ?? undefined,
          googleEventId: meeting.googleEventId ?? undefined,
          meetLink: meeting.meetLink ?? undefined,
        });
      } catch (err) {
        this.logger.warn("Resend confirmation failed (non-fatal)", {
          to: email,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return right(undefined);
  }
}
