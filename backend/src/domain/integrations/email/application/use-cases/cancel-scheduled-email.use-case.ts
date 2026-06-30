import { Injectable, Logger, Optional } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { ScheduledEmailSendsRepository } from "../repositories/scheduled-email-sends.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

export interface CancelScheduledEmailInput {
  scheduledEmailId: string;
  requesterId: string;
  requesterRole: string;
}

@Injectable()
export class CancelScheduledEmailUseCase {
  private readonly logger = new Logger(CancelScheduledEmailUseCase.name);

  constructor(
    private readonly scheduled: ScheduledEmailSendsRepository,
    @Optional() private readonly activities?: ActivitiesRepository,
  ) {}

  async execute(input: CancelScheduledEmailInput): Promise<Either<Error, { id: string }>> {
    const record = await this.scheduled.findById(input.scheduledEmailId);
    if (!record) return left(new Error("Agendamento não encontrado"));

    const isOwner = record.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    if (!record.isPending) {
      return left(new Error("Só é possível cancelar e-mails ainda pendentes"));
    }

    record.markCancelled();
    await this.scheduled.save(record);

    // Skip the pending activity so it doesn't linger as a future send in the UI.
    if (record.activityId && this.activities) {
      try {
        const activity = await this.activities.findByIdRaw(record.activityId);
        if (activity && !activity.completed && !activity.failedAt && !activity.skippedAt) {
          activity.update({ scheduledSendAt: undefined });
          activity.skip("Envio agendado cancelado");
          await this.activities.save(activity);
        }
      } catch (err) {
        this.logger.warn("Failed to skip activity on cancel", {
          activityId: record.activityId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return right({ id: record.id.toString() });
  }
}
