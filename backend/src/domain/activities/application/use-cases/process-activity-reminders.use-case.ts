import { Injectable, Logger } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import { CreateNotificationUseCase } from "@/domain/notifications/application/use-cases/notifications.use-cases";
import { Activity } from "../../enterprise/entities/activity";

export interface ProcessActivityRemindersOutput {
  reminded: number;
}

/**
 * Fires the "notificar-me" reminders: for each activity whose `remindAt` has
 * passed (and that has not been reminded yet and is not completed), create a
 * bell notification for the owner and stamp `remindedAt` so it only fires once.
 * Driven by a 1-minute cron.
 */
@Injectable()
export class ProcessActivityRemindersUseCase {
  private readonly logger = new Logger(ProcessActivityRemindersUseCase.name);

  constructor(
    private readonly activities: ActivitiesRepository,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  async execute(input?: { now?: Date }): Promise<Either<never, ProcessActivityRemindersOutput>> {
    const now = input?.now ?? new Date();
    const due = await this.activities.findDueReminders(now);

    let reminded = 0;
    for (const activity of due) {
      const link = this.buildLink(activity);
      const result = await this.createNotification.execute({
        type: "ACTIVITY_REMINDER",
        title: "⏰ Lembrete de atividade",
        summary: activity.subject,
        userId: activity.ownerId,
        payload: JSON.stringify({
          activityId: activity.id.toString(),
          leadId: activity.leadId ?? null,
          organizationId: activity.organizationId ?? null,
          partnerId: activity.partnerId ?? null,
          link,
        }),
      });

      if (result.isRight()) {
        await this.activities.markAsReminded(activity.id.toString(), now);
        reminded++;
      } else {
        this.logger.warn(`Failed to create reminder notification for activity ${activity.id.toString()}`);
      }
    }

    return right({ reminded });
  }

  private buildLink(a: Activity): string {
    if (a.leadId) return `/leads/${a.leadId}#atividades`;
    if (a.organizationId) return `/organizations/${a.organizationId}`;
    if (a.partnerId) return `/partners/${a.partnerId}`;
    return `/activities/${a.id.toString()}`;
  }
}
