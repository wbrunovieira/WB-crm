import { Injectable, Logger } from "@nestjs/common";
import { left, right, type Either } from "@/core/either";
import { ActivitiesRepository } from "../repositories/activities.repository";
import { TriggerCallAnalysisUseCase } from "@/domain/integrations/call-analysis/application/use-cases/trigger-call-analysis.use-case";
import type { Activity } from "../../enterprise/entities/activity";

export interface UpdateActivityInput {
  id: string;
  requesterId: string;
  requesterRole: string;
  type?: string;
  subject?: string;
  description?: string;
  dueDate?: Date | null;
  dealId?: string | null;
  contactIds?: string[];
  leadContactIds?: string[];
  leadId?: string | null;
  organizationId?: string | null;
  partnerId?: string | null;
  callContactType?: string | null;
  meetingNoShow?: boolean;
  gotoCallOutcome?: string | null;
}

type Output = Either<Error, { activity: Activity }>;

@Injectable()
export class UpdateActivityUseCase {
  private readonly logger = new Logger(UpdateActivityUseCase.name);

  constructor(
    private readonly activities: ActivitiesRepository,
    private readonly triggerCallAnalysis: TriggerCallAnalysisUseCase,
  ) {}

  async execute(input: UpdateActivityInput): Promise<Output> {
    const activity = await this.activities.findByIdRaw(input.id);
    if (!activity) return left(new Error("Atividade não encontrada"));

    const isOwner = activity.ownerId === input.requesterId;
    const isAdmin = input.requesterRole === "admin";
    if (!isOwner && !isAdmin) return left(new Error("Não autorizado"));

    const updates: Parameters<typeof activity.update>[0] = {};

    if (input.type !== undefined)        updates.type = input.type;
    if (input.subject !== undefined)     updates.subject = input.subject.trim();
    if (input.description !== undefined) updates.description = input.description;
    if (input.dueDate !== undefined)     updates.dueDate = input.dueDate ?? undefined;
    if (input.dealId !== undefined)      updates.dealId = input.dealId ?? undefined;
    if (input.leadId !== undefined)         updates.leadId = input.leadId ?? undefined;
    if (input.organizationId !== undefined) updates.organizationId = input.organizationId ?? undefined;
    if (input.partnerId !== undefined)      updates.partnerId = input.partnerId ?? undefined;
    if (input.callContactType !== undefined) updates.callContactType = input.callContactType ?? undefined;
    if (input.meetingNoShow !== undefined)   updates.meetingNoShow = input.meetingNoShow;
    if (input.gotoCallOutcome !== undefined) updates.gotoCallOutcome = input.gotoCallOutcome ?? undefined;

    if (input.contactIds !== undefined) {
      const ids = input.contactIds ?? [];
      updates.contactId = ids[0] ?? undefined;
      updates.contactIds = ids.length > 0 ? JSON.stringify(ids) : undefined;
    }

    if (input.leadContactIds !== undefined) {
      const ids = input.leadContactIds ?? [];
      updates.leadContactIds = ids.length > 0 ? JSON.stringify(ids) : undefined;
    }

    activity.update(updates);
    await this.activities.save(activity);

    if (
      input.callContactType === "decisor" &&
      activity.gotoTranscriptText
    ) {
      const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3010";
      const webhookUrl = `${backendUrl}/webhooks/call-analysis`;

      setImmediate(() => {
        this.triggerCallAnalysis
          .execute({
            activityId: activity.id.toString(),
            activitySubject: activity.subject,
            activityNotes: activity.description,
            transcript: activity.gotoTranscriptText!,
            callDurationSeconds: activity.gotoDuration ?? 0,
            callDate: activity.dueDate,
            leadId: activity.leadId,
            ownerId: activity.ownerId,
            webhookUrl,
          })
          .then((result) => {
            if (result.isLeft()) {
              this.logger.error(`Failed to trigger call analysis: ${result.value.message}`);
            } else {
              this.logger.log(`Call analysis triggered: ${result.value.analysisId}`);
            }
          })
          .catch((err: unknown) => {
            this.logger.error(`Exception triggering call analysis: ${String(err)}`);
          });
      });
    }

    return right({ activity });
  }
}
