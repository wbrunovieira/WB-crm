import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetingsRepository, MeetingRecord, MeetingFilters } from "../repositories/meetings.repository";
import { GoogleCalendarPort } from "../ports/google-calendar.port";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";

export class MeetingNotFoundError extends Error { name = "MeetingNotFoundError"; }
export class MeetingForbiddenError extends Error { name = "MeetingForbiddenError"; }

interface BrandConfig {
  companyName: string;
  primaryColor: string;
  bgColor: string;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  logoUrl: string | null;
  logoAlt: string;
  font: string;
}

const BRAND_CONFIGS: { domain: string; config: BrandConfig }[] = [
  {
    domain: "salto",
    config: {
      companyName: "Salto",
      primaryColor: "#ff5c00",
      bgColor: "#0e0e0e",
      surfaceColor: "#141414",
      borderColor: "#252525",
      textColor: "#f5f5f5",
      mutedColor: "#888888",
      logoUrl: null, // TODO: substituir pela URL pública do logo Salto
      logoAlt: "Salto",
      font: "Montserrat, Arial, sans-serif",
    },
  },
  {
    domain: "wbdigitalsolutions",
    config: {
      companyName: "WB Digital Solutions",
      primaryColor: "#792990",
      bgColor: "#350545",
      surfaceColor: "#4a1060",
      borderColor: "#5a2070",
      textColor: "#ffffff",
      mutedColor: "#aaa6c3",
      logoUrl: "https://www.wbdigitalsolutions.com/svg/logo-white.svg",
      logoAlt: "WB Digital Solutions",
      font: "'Plus Jakarta Sans', Arial, sans-serif",
    },
  },
];

const DEFAULT_BRAND: BrandConfig = {
  companyName: "",
  primaryColor: "#1a73e8",
  bgColor: "#ffffff",
  surfaceColor: "#f8f9fa",
  borderColor: "#e0e0e0",
  textColor: "#222222",
  mutedColor: "#666666",
  logoUrl: null,
  logoAlt: "",
  font: "Arial, sans-serif",
};

function getBrandConfig(email: string): BrandConfig {
  const lower = email.toLowerCase();
  for (const { domain, config } of BRAND_CONFIGS) {
    if (lower.includes(domain)) return config;
  }
  return DEFAULT_BRAND;
}

function buildBrandedEmail(params: {
  brand: BrandConfig;
  title: string;
  startAt: Date;
  endAt: Date;
  meetLink: string | undefined;
  description: string | undefined;
  organizerEmail: string;
}): string {
  const { brand, title, startAt, endAt, meetLink, description, organizerEmail } = params;

  const fmt = (d: Date) =>
    d.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

  const logoHtml = brand.logoUrl
    ? `<img src="${brand.logoUrl}" alt="${brand.logoAlt}" style="height:40px;max-width:200px;object-fit:contain;" />`
    : `<span style="font-size:20px;font-weight:bold;color:${brand.textColor};">${brand.companyName || brand.logoAlt}</span>`;

  const meetLinkHtml = meetLink
    ? `<div style="margin:24px 0;">
        <a href="${meetLink}" style="background:${brand.primaryColor};color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;display:inline-block;">
          Entrar no Google Meet
        </a>
        <p style="margin:10px 0 0;color:${brand.mutedColor};font-size:12px;">${meetLink}</p>
       </div>`
    : "";

  const descHtml = description
    ? `<p style="color:${brand.mutedColor};font-size:14px;margin:0 0 16px;">${description}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${brand.bgColor};border-radius:12px;overflow:hidden;font-family:${brand.font};">

        <!-- Header -->
        <tr>
          <td style="background:${brand.primaryColor};padding:24px 32px;">
            ${logoHtml}
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;color:${brand.textColor};">
            <p style="margin:0 0 8px;font-size:16px;">Olá,</p>
            <p style="margin:0 0 24px;font-size:16px;">Gostaria de confirmar nossa reunião:</p>

            <!-- Meeting details -->
            <table cellpadding="0" cellspacing="0" style="width:100%;background:${brand.surfaceColor};border-radius:8px;border:1px solid ${brand.borderColor};margin-bottom:24px;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid ${brand.borderColor};">
                  <span style="color:${brand.mutedColor};font-size:13px;">📅 Assunto</span><br>
                  <strong style="color:${brand.textColor};font-size:15px;">${title}</strong>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid ${brand.borderColor};">
                  <span style="color:${brand.mutedColor};font-size:13px;">🕐 Início</span><br>
                  <span style="color:${brand.textColor};font-size:14px;">${fmt(startAt)}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;">
                  <span style="color:${brand.mutedColor};font-size:13px;">🕐 Término</span><br>
                  <span style="color:${brand.textColor};font-size:14px;">${fmt(endAt)}</span>
                </td>
              </tr>
            </table>

            ${descHtml}
            ${meetLinkHtml}

            <p style="color:${brand.mutedColor};font-size:13px;margin:0 0 24px;">
              Você também recebeu um convite pelo Google Agenda para confirmar sua presença (Aceitar / Recusar).
            </p>

            <p style="margin:0;color:${brand.textColor};font-size:14px;">
              Atenciosamente,<br>
              <strong>${organizerEmail}</strong>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:${brand.surfaceColor};border-top:1px solid ${brand.borderColor};padding:16px 32px;text-align:center;">
            <span style="color:${brand.mutedColor};font-size:12px;">${brand.companyName || organizerEmail}</span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

@Injectable()
export class GetMeetingsUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { requesterId: string; filters?: MeetingFilters }): Promise<Either<Error, MeetingRecord[]>> {
    return right(await this.repo.findByOwner(input.requesterId, input.filters));
  }
}

@Injectable()
export class CheckMeetingTitleUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { requesterId: string; title: string; excludeId?: string }): Promise<Either<Error, { exists: boolean }>> {
    const exists = await this.repo.titleExistsByOwner(input.requesterId, input.title, input.excludeId);
    return right({ exists });
  }
}

@Injectable()
export class UpdateMeetingSummaryUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { id: string; requesterId: string; summary: string | null }): Promise<Either<Error, void>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));
    await this.repo.updateSummary(input.id, input.summary);
    return right(undefined);
  }
}

@Injectable()
export class GetMeetingByIdUseCase {
  constructor(private readonly repo: MeetingsRepository) {}

  async execute(input: { id: string; requesterId: string }): Promise<Either<Error, MeetingRecord>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));
    return right(meeting);
  }
}

@Injectable()
export class ScheduleMeetingUseCase {
  private readonly logger = new Logger(ScheduleMeetingUseCase.name);

  constructor(
    private readonly repo: MeetingsRepository,
    private readonly calendarPort: GoogleCalendarPort,
    @Optional() private readonly gmailPort?: GmailPort,
  ) {}

  async execute(input: {
    title: string;
    startAt: Date;
    endAt?: Date;
    attendeeEmails: string[];
    organizerEmail?: string;
    description?: string;
    leadId?: string;
    contactId?: string;
    organizationId?: string;
    dealId?: string;
    requesterId: string;
    createActivity?: boolean;
    skipCalendar?: boolean;
  }): Promise<Either<Error, MeetingRecord>> {
    if (!input.title.trim()) return left(new Error("title não pode ser vazio"));

    const attendeeEmails = [...new Set(input.attendeeEmails)];

    let googleEventId: string | undefined;
    let meetLink: string | undefined;

    if (!input.skipCalendar) {
      try {
        const calResult = await this.calendarPort.createMeetEvent({
          title: input.title.trim(),
          startAt: input.startAt,
          endAt: input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000),
          attendeeEmails,
          description: input.description,
          organizerEmail: input.organizerEmail,
          // Always "all" — Google Calendar sends the native RSVP invite; Gmail alias sends a courtesy notification
          sendUpdates: "all",
        });
        googleEventId = calResult.googleEventId;
        meetLink = calResult.meetLink ?? undefined;
      } catch {
        // Calendar failure is non-fatal
      }
    }

    // When an alias is selected, send a courtesy email from the primary Gmail account.
    // Reply-To and Cc point to the alias so the client sees it and replies there.
    // Sending from primary avoids SPF/DKIM failures that block strict providers (e.g. Yahoo).
    const sendAliasEmail = !!input.organizerEmail && !!this.gmailPort && !input.skipCalendar;
    if (sendAliasEmail) {
      const alias = input.organizerEmail!;

      // Fetch primary email so we send explicitly from it (not Gmail's default send-as alias)
      let primaryEmail: string | undefined;
      try {
        const profile = await this.gmailPort!.getProfile("google-token-singleton");
        primaryEmail = profile.emailAddress;
      } catch {
        // Non-fatal: if profile fetch fails, Gmail uses account default
      }
      const title = input.title.trim();
      const brand = getBrandConfig(alias);
      const endAt = input.endAt ?? new Date(input.startAt.getTime() + 60 * 60 * 1000);

      const bodyHtml = buildBrandedEmail({
        brand,
        title,
        startAt: input.startAt,
        endAt,
        meetLink: meetLink ?? undefined,
        description: input.description,
        organizerEmail: alias,
      });

      for (const to of attendeeEmails) {
        try {
          await this.gmailPort!.send({
            userId: "google-token-singleton",
            to,
            from: primaryEmail,
            replyTo: alias,
            cc: alias,
            subject: `Reunião agendada: ${title}`,
            bodyHtml,
          });
        } catch (err) {
          this.logger.warn("Failed to send alias courtesy email", {
            to,
            alias,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const meeting = await this.repo.create({
      title: input.title.trim(),
      startAt: input.startAt,
      endAt: input.endAt,
      attendeeEmails,
      organizerEmail: input.organizerEmail,
      googleEventId,
      meetLink,
      description: input.description,
      leadId: input.leadId,
      contactId: input.contactId,
      organizationId: input.organizationId,
      dealId: input.dealId,
      ownerId: input.requesterId,
      createActivity: input.createActivity,
    });
    return right(meeting);
  }
}

@Injectable()
export class UpdateMeetingUseCase {
  constructor(
    private readonly repo: MeetingsRepository,
    private readonly calendarPort: GoogleCalendarPort,
  ) {}

  async execute(input: {
    id: string;
    requesterId: string;
    title?: string;
    startAt?: Date;
    endAt?: Date;
    status?: string;
    attendeeEmails?: string[];
  }): Promise<Either<Error, MeetingRecord>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));

    if (meeting.googleEventId && (input.title || input.startAt || input.endAt || input.attendeeEmails)) {
      try {
        await this.calendarPort.updateEvent(meeting.googleEventId, {
          title: input.title,
          startAt: input.startAt,
          endAt: input.endAt,
          attendeeEmails: input.attendeeEmails,
        });
      } catch {
        // Non-fatal — proceed with DB update even if Calendar fails
      }
    }

    const updated = await this.repo.update(input.id, {
      title: input.title,
      startAt: input.startAt,
      endAt: input.endAt,
      status: input.status,
      attendeeEmails: input.attendeeEmails,
    });
    if (meeting.activityId && (input.startAt || input.title)) {
      await this.repo.updateActivitySchedule(meeting.activityId, {
        dueDate: input.startAt,
        subject: input.title ? `Reunião: ${input.title}` : undefined,
      });
    }
    return right(updated);
  }
}

@Injectable()
export class CancelMeetingUseCase {
  constructor(
    private readonly repo: MeetingsRepository,
    private readonly calendarPort: GoogleCalendarPort,
  ) {}

  async execute(input: { id: string; requesterId: string }): Promise<Either<Error, void>> {
    const meeting = await this.repo.findById(input.id);
    if (!meeting) return left(new MeetingNotFoundError("Reunião não encontrada"));
    if (meeting.ownerId !== input.requesterId) return left(new MeetingForbiddenError("Acesso negado"));

    if (meeting.googleEventId) {
      try {
        await this.calendarPort.cancelEvent(meeting.googleEventId);
      } catch {
        // Non-fatal — proceed with DB cancellation even if Calendar fails
      }
    }

    await this.repo.update(input.id, { status: "cancelled" });
    if (meeting.activityId) {
      await this.repo.skipActivity(meeting.activityId, "Reunião cancelada");
    }
    return right(undefined);
  }
}
