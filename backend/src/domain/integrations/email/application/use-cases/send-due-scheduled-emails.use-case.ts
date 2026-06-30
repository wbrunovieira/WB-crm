import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ScheduledEmailSendsRepository } from "../repositories/scheduled-email-sends.repository";
import { SendEmailUseCase } from "./send-email.use-case";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

const GOOGLE_TOKEN_SINGLETON = "google-token-singleton";

export interface SendDueScheduledEmailsOutput {
  sent: number;
  failed: number;
}

/**
 * Worker: sends every PENDING ScheduledEmailSend whose scheduledSendAt has passed.
 * On success the linked (pending) activity is completed in place via
 * SendEmailUseCase's existingActivityId; on failure the record is marked FAILED and
 * the activity is failed so the miss is visible on the lead/contact page.
 */
@Injectable()
export class SendDueScheduledEmailsUseCase {
  private readonly logger = new Logger(SendDueScheduledEmailsUseCase.name);

  constructor(
    private readonly scheduled: ScheduledEmailSendsRepository,
    private readonly sendEmail: SendEmailUseCase,
    @Optional() private readonly activities?: ActivitiesRepository,
  ) {}

  async execute(
    now: Date = new Date(),
    limit = 50,
  ): Promise<Either<Error, SendDueScheduledEmailsOutput>> {
    const due = await this.scheduled.findDue(now, limit);
    let sent = 0;
    let failed = 0;

    for (const record of due) {
      // findDue already filters PENDING, but re-check in case of races.
      if (!record.isPending) continue;

      const result = await this.sendEmail.execute({
        userId: GOOGLE_TOKEN_SINGLETON,
        to: record.to,
        subject: record.subject,
        bodyHtml: record.bodyHtml,
        fromEmail: record.fromEmail ?? undefined,
        threadId: record.threadId ?? undefined,
        attachments: record.attachments.map((a) => ({
          filename: a.filename,
          mimeType: a.mimeType,
          data: a.data,
        })),
        ownerId: record.ownerId,
        leadId: record.leadId ?? undefined,
        contactIds: record.contactIds,
        organizationId: record.organizationId ?? undefined,
        dealId: record.dealId ?? undefined,
        existingActivityId: record.activityId ?? undefined,
      });

      if (result.isRight()) {
        record.markSent(result.value.messageId, result.value.threadId, now);
        await this.scheduled.save(record);
        sent++;
      } else {
        const reason = result.value.message;
        this.logger.error(`Scheduled email ${record.id.toString()} failed: ${reason}`);
        record.markFailed(reason, now);
        await this.scheduled.save(record);
        await this.failActivity(record.activityId, reason);
        failed++;
      }
    }

    if (sent > 0 || failed > 0) {
      this.logger.log(`Scheduled emails: ${sent} sent, ${failed} failed`);
    }

    return right({ sent, failed });
  }

  private async failActivity(activityId: string | null, reason: string): Promise<void> {
    if (!activityId || !this.activities) return;
    try {
      const activity = await this.activities.findByIdRaw(activityId);
      if (!activity || activity.failedAt) return;
      activity.update({ scheduledSendAt: undefined });
      activity.fail(`Falha ao enviar e-mail agendado: ${reason}`);
      await this.activities.save(activity);
    } catch (err) {
      this.logger.warn("Failed to mark scheduled-email activity as failed", {
        activityId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
