import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import { GatekeeperAnalysisRepository } from "@/domain/integrations/gatekeeper-analysis/application/repositories/gatekeeper-analysis.repository";
import { CallAnalysis } from "@/domain/integrations/call-analysis/enterprise/entities/call-analysis.entity";
import { CallAnalysisRepository } from "@/domain/integrations/call-analysis/application/repositories/call-analysis.repository";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";
import { TransferAnalysisAgentPort } from "../ports/transfer-analysis-agent.port";

export class ActivityNotFoundError extends Error { name = "ActivityNotFoundError"; }
export class MissingTranscriptError extends Error { name = "MissingTranscriptError"; }

type Input = {
  activityId: string;
  ownerId: string;
  gkWebhookUrl: string;
  spicedWebhookUrl: string;
};

type Output = Either<Error, { gkAnalysisId: string; spicedAnalysisId: string }>;

@Injectable()
export class TriggerTransferAnalysisUseCase {
  constructor(
    private readonly gkRepo: GatekeeperAnalysisRepository,
    private readonly callRepo: CallAnalysisRepository,
    private readonly agentPort: TransferAnalysisAgentPort,
    private readonly activities: ActivitiesRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const ctx = await this.activities.findAnalysisContext(input.activityId);
    if (!ctx) return left(new ActivityNotFoundError("Atividade não encontrada"));
    if (!ctx.gotoTranscriptText) return left(new MissingTranscriptError("Atividade ainda não possui transcrição"));

    const [existingGk, existingSpiced] = await Promise.all([
      this.gkRepo.findByActivityId(input.activityId),
      this.callRepo.findByActivityId(input.activityId),
    ]);

    const gkActive = existingGk && existingGk.status !== "error";
    const spicedActive = existingSpiced && existingSpiced.status !== "error";

    // Resolve or create GK analysis
    let gkAnalysis: GatekeeperAnalysis;
    if (gkActive) {
      gkAnalysis = existingGk;
    } else {
      gkAnalysis = GatekeeperAnalysis.create({
        activityId: input.activityId,
        ownerId: input.ownerId,
        status: "pending",
        jobId: new UniqueEntityID().toString(),
      });
      await this.gkRepo.save(gkAnalysis);
    }

    // Resolve or create SPICED analysis
    let spicedAnalysis: CallAnalysis;
    if (spicedActive) {
      spicedAnalysis = existingSpiced;
    } else {
      spicedAnalysis = CallAnalysis.create({
        activityId: input.activityId,
        ownerId: input.ownerId,
        status: "pending",
        jobId: new UniqueEntityID().toString(),
      });
      await this.callRepo.save(spicedAnalysis);
    }

    // Only call agent if at least one was re-triggered
    if (!gkActive || !spicedActive) {
      await this.agentPort.request({
        gkJobId: gkAnalysis.jobId!,
        spicedJobId: spicedAnalysis.jobId!,
        gkWebhookUrl: input.gkWebhookUrl,
        spicedWebhookUrl: input.spicedWebhookUrl,
        transcript: ctx.gotoTranscriptText,
        callDurationSeconds: ctx.gotoDuration ?? undefined,
        callDate: ctx.dueDate?.toISOString(),
        lead: {
          id: ctx.lead?.id ?? "",
          businessName: ctx.lead?.businessName ?? "",
          segment: ctx.lead?.segment ?? undefined,
          city: ctx.lead?.city ?? undefined,
        },
        contact: {
          name: ctx.contact?.name ?? undefined,
          role: ctx.contact?.role ?? undefined,
        },
        activity: {
          id: input.activityId,
          subject: ctx.subject,
        },
      });
    }

    return right({
      gkAnalysisId: gkAnalysis.id.toString(),
      spicedAnalysisId: spicedAnalysis.id.toString(),
    });
  }
}
