import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ScheduledEmailSendsRepository } from "../repositories/scheduled-email-sends.repository";
import { SendEmailUseCase } from "./send-email.use-case";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

const GOOGLE_TOKEN_SINGLETON = "google-token-singleton";

export interface SendScheduledEmailNowInput {
  activityId: string;
  requesterId: string;
  requesterRole: string;
}

/**
 * Sends a PENDING scheduled email right now, bypassing its scheduledSendAt.
 * Triggered from the timeline "Enviar agora" button (which only knows the
 * activityId). Reuses SendEmailUseCase so the pending activity is completed in
 * place; on failure the record is marked FAILED and the activity failed.
 */
@Injectable()
export class SendScheduledEmailNowUseCase {
  private readonly logger = new Logger(SendScheduledEmailNowUseCase.name);

  constructor(
    private readonly scheduled: ScheduledEmailSendsRepository,
    private readonly sendEmail: SendEmailUseCase,
    @Optional() private readonly activities?: ActivitiesRepository,
  ) {}

  async execute(input: SendScheduledEmailNowInput): Promise<Either<Error, { id: string }>> {
    const record = await this.scheduled.findByActivityId(input.activityId);
    if (!record) return left(new Error("Agendamento não encontrado"));

    const isOwner = record.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    if (!record.isPending) {
      return left(new Error("Só é possível enviar e-mails ainda pendentes"));
    }

    const now = new Date();
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
      return right({ id: record.id.toString() });
    }

    const reason = result.value.message;
    this.logger.error(`Send-now failed for scheduled email ${record.id.toString()}: ${reason}`);
    record.markFailed(reason, now);
    await this.scheduled.save(record);
    await this.failActivity(record.activityId, reason);
    return left(result.value);
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
