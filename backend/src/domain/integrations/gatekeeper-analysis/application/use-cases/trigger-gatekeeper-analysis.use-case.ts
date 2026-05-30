import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { GatekeeperAnalysis } from "../../enterprise/entities/gatekeeper-analysis.entity";
import { GatekeeperAnalysisRepository } from "../repositories/gatekeeper-analysis.repository";
import { GatekeeperAnalysisAgentPort } from "../ports/gatekeeper-analysis-agent.port";
import { ActivitiesRepository } from "@/domain/activities/application/repositories/activities.repository";

export class ActivityNotFoundError extends Error { name = "ActivityNotFoundError"; }
export class MissingTranscriptError extends Error { name = "MissingTranscriptError"; }

type Input = {
  activityId: string;
  ownerId: string;
  webhookUrl: string;
};

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class TriggerGatekeeperAnalysisUseCase {
  constructor(
    private readonly repo: GatekeeperAnalysisRepository,
    private readonly agentPort: GatekeeperAnalysisAgentPort,
    private readonly activities: ActivitiesRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const ctx = await this.activities.findAnalysisContext(input.activityId);
    if (!ctx) return left(new ActivityNotFoundError("Atividade não encontrada"));
    if (!ctx.gotoTranscriptText) return left(new MissingTranscriptError("Atividade ainda não possui transcrição"));

    const existing = await this.repo.findByActivityId(input.activityId);
    if (existing && existing.status !== "error") {
      return right({ analysisId: existing.id.toString() });
    }

    const jobId = new UniqueEntityID().toString();

    const analysis = GatekeeperAnalysis.create({
      activityId: input.activityId,
      ownerId: input.ownerId,
      status: "pending",
      jobId,
    });

    await this.repo.save(analysis);

    await this.agentPort.request({
      jobId,
      webhookUrl: input.webhookUrl,
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

    return right({ analysisId: analysis.id.toString() });
  }
}
