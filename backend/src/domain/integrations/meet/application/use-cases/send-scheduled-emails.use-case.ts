import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ScheduledEmailsRepository, ScheduledEmailRecord } from "../repositories/scheduled-emails.repository";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { EvolutionApiPort } from "@/domain/integrations/whatsapp/application/ports/evolution-api.port";
import { buildReminderEmail, ReminderType } from "../../infra/email-templates/meeting-reminder.templates";

const REMINDER_TYPE_LABELS: Record<string, string> = {
  morning_reminder: "Lembrete do dia",
  one_hour_reminder: "Faltam 1 hora",
  on_time_reminder: "Agora é a hora",
};

@Injectable()
export class SendScheduledEmailsUseCase {
  private readonly logger = new Logger(SendScheduledEmailsUseCase.name);

  constructor(
    private readonly repo: ScheduledEmailsRepository,
    @Optional() private readonly gmail?: GmailPort,
    @Optional() private readonly whatsApp?: EvolutionApiPort,
  ) {}

  async execute(): Promise<Either<Error, { sent: number; failed: number }>> {
    if (!this.gmail && !this.whatsApp) {
      this.logger.warn("Neither GmailPort nor EvolutionApiPort available — skipping reminder send");
      return right({ sent: 0, failed: 0 });
    }

    const due = await this.repo.findDue(new Date(), 50);
    let sent = 0;
    let failed = 0;

    for (const record of due) {
      try {
        await this.sendOne(record);
        await this.repo.markSent(record.id);
        sent++;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send reminder ${record.id}: ${reason}`);
        await this.repo.markFailed(record.id, reason);
        failed++;
      }
    }

    if (sent > 0 || failed > 0) {
      this.logger.log(`Meeting reminders: ${sent} sent, ${failed} failed`);
    }

    return right({ sent, failed });
  }

  private async sendOne(record: ScheduledEmailRecord): Promise<void> {
    if (record.channel === "whatsapp" && record.recipientPhone) {
      await this.sendOneWhatsApp(record);
      return;
    }

    if (!this.gmail) {
      throw new Error("GmailPort not available for email channel");
    }

    const endAt = record.meetingEndAt ?? new Date(record.meetingStartAt.getTime() + 60 * 60 * 1000);

    const { subject, html } = buildReminderEmail(record.type as ReminderType, {
      organizerEmail: record.organizerEmail ?? "",
      meetingTitle: record.meetingTitle,
      meetingStartAt: record.meetingStartAt,
      meetingEndAt: endAt,
      meetLink: record.meetLink ?? undefined,
      contactName: record.contactName ?? undefined,
      companyName: record.companyName ?? undefined,
    });

    await this.gmail.send({
      userId: "google-token-singleton",
      to: record.recipientEmail,
      from: record.organizerEmail ?? undefined,
      replyTo: record.organizerEmail ?? undefined,
      subject,
      bodyHtml: html,
    });
  }

  private async sendOneWhatsApp(record: ScheduledEmailRecord): Promise<void> {
    if (!this.whatsApp) {
      throw new Error("EvolutionApiPort not available for WhatsApp channel");
    }

    const dateStr = record.meetingStartAt.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    });
    const timeStr = record.meetingStartAt.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    });
    const typeLabel = REMINDER_TYPE_LABELS[record.type] ?? record.type;

    const lines = [
      `📅 *${record.meetingTitle}*`,
      `🔔 ${typeLabel}`,
      `🗓 ${dateStr} às ${timeStr}`,
    ];
    if (record.meetingDescription) {
      lines.push(record.meetingDescription);
    }

    await this.whatsApp.sendText(record.recipientPhone!, lines.join("\n"));
  }
}
