import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { CallAnalysis } from "../../enterprise/entities/call-analysis.entity";
import { CallAnalysisRepository } from "../repositories/call-analysis.repository";
import { CallAnalysisAgentPort } from "../ports/call-analysis-agent.port";

type Input = {
  activityId: string;
  activitySubject: string;
  activityNotes?: string;
  transcript: string;
  callDurationSeconds?: number;
  callDate?: Date;
  leadId?: string;
  leadBusinessName?: string;
  leadDescription?: string;
  leadSegment?: string;
  leadCity?: string;
  leadActivities?: string;
  contactName?: string;
  contactRole?: string;
  ownerId: string;
  webhookUrl: string;
};

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class TriggerCallAnalysisUseCase {
  constructor(
    private readonly repo: CallAnalysisRepository,
    private readonly agentPort: CallAnalysisAgentPort,
  ) {}

  async execute(input: Input): Promise<Output> {
    // Check for existing analysis — avoid duplicates unless previous attempt errored
    const existing = await this.repo.findByActivityId(input.activityId);
    if (existing && existing.status !== "error") {
      return right({ analysisId: existing.id.toString() });
    }

    const jobId = existing?.jobId ?? new UniqueEntityID().toString();

    const analysis = CallAnalysis.create({
      activityId: input.activityId,
      leadId: input.leadId,
      ownerId: input.ownerId,
      status: "pending",
      jobId,
    });

    await this.repo.save(analysis);

    await this.agentPort.request({
      jobId,
      webhookUrl: input.webhookUrl,
      transcript: input.transcript,
      callDurationSeconds: input.callDurationSeconds,
      callDate: input.callDate?.toISOString(),
      lead: {
        id: input.leadId ?? "",
        businessName: input.leadBusinessName ?? "",
        description: input.leadDescription,
        segment: input.leadSegment,
        city: input.leadCity,
        activities: input.leadActivities,
      },
      contact: {
        name: input.contactName,
        role: input.contactRole,
      },
      activity: {
        id: input.activityId,
        subject: input.activitySubject,
        notes: input.activityNotes,
      },
    });

    return right({ analysisId: analysis.id.toString() });
  }
}
