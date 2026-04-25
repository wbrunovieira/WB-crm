import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ScheduledEmailsRepository, ScheduledEmailRecord } from "../repositories/scheduled-emails.repository";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { buildReminderEmail, ReminderType } from "../../infra/email-templates/meeting-reminder.templates";

@Injectable()
export class SendScheduledEmailsUseCase {
  private readonly logger = new Logger(SendScheduledEmailsUseCase.name);

  constructor(
    private readonly repo: ScheduledEmailsRepository,
    @Optional() private readonly gmail?: GmailPort,
  ) {}

  async execute(): Promise<Either<Error, { sent: number; failed: number }>> {
    if (!this.gmail) {
      this.logger.warn("GmailPort not available — skipping reminder send");
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

    await this.gmail!.send({
      userId: "google-token-singleton",
      to: record.recipientEmail,
      from: record.organizerEmail ?? undefined,
      replyTo: record.organizerEmail ?? undefined,
      subject,
      bodyHtml: html,
    });
  }
}
