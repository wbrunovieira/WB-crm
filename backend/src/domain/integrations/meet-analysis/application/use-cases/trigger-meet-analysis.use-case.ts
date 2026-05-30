import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { MeetAnalysis } from "../../enterprise/entities/meet-analysis.entity";
import { MeetAnalysisRepository } from "../repositories/meet-analysis.repository";
import { MeetAnalysisAgentPort } from "../ports/meet-analysis-agent.port";
import { MeetingsRepository } from "@/domain/integrations/meet/application/repositories/meetings.repository";

export class MeetingNotFoundError extends Error { name = "MeetingNotFoundError"; }
export class MissingTranscriptError extends Error { name = "MissingTranscriptError"; }

type Input = {
  activityId: string;
  ownerId: string;
  webhookUrl: string;
};

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class TriggerMeetAnalysisUseCase {
  constructor(
    private readonly repo: MeetAnalysisRepository,
    private readonly agentPort: MeetAnalysisAgentPort,
    private readonly meetings: MeetingsRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const ctx = await this.meetings.findMeetAnalysisContext(input.activityId);
    if (!ctx) return left(new MeetingNotFoundError("Reunião não encontrada para esta atividade"));
    if (!ctx.transcriptText) return left(new MissingTranscriptError("Reunião ainda não possui transcrição"));

    const existing = await this.repo.findByActivityId(input.activityId);
    if (existing && existing.status !== "error") {
      return right({ analysisId: existing.id.toString() });
    }

    const jobId = existing?.jobId ?? new UniqueEntityID().toString();

    const analysis = MeetAnalysis.create({
      activityId: input.activityId,
      leadId: ctx.lead?.id,
      ownerId: input.ownerId,
      status: "pending",
      jobId,
    });

    await this.repo.save(analysis);

    await this.agentPort.request({
      jobId,
      webhookUrl: input.webhookUrl,
      transcript: ctx.transcriptText,
      meetingDurationSeconds: ctx.durationSeconds ?? undefined,
      meetingDate: ctx.meetingDate?.toISOString(),
      meetingTitle: ctx.title,
      lead: {
        id: ctx.lead?.id ?? "",
        businessName: ctx.lead?.businessName ?? "",
        description: ctx.lead?.description ?? undefined,
        segment: ctx.lead?.segment ?? undefined,
        city: ctx.lead?.city ?? undefined,
      },
      contact: {
        name: ctx.contact?.name ?? undefined,
        role: ctx.contact?.role ?? undefined,
      },
      activity: {
        id: input.activityId,
        subject: ctx.title,
        notes: undefined,
      },
    });

    return right({ analysisId: analysis.id.toString() });
  }
}
