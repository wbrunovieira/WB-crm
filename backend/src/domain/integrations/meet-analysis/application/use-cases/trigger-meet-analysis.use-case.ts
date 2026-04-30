import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { MeetAnalysis } from "../../enterprise/entities/meet-analysis.entity";
import { MeetAnalysisRepository } from "../repositories/meet-analysis.repository";
import { MeetAnalysisAgentPort } from "../ports/meet-analysis-agent.port";

type Input = {
  activityId: string;
  activitySubject: string;
  activityNotes?: string;
  transcript: string;
  meetingDurationSeconds?: number;
  meetingDate?: Date;
  meetingTitle?: string;
  leadId?: string;
  leadBusinessName?: string;
  leadDescription?: string;
  leadSegment?: string;
  leadCity?: string;
  contactName?: string;
  contactRole?: string;
  ownerId: string;
  webhookUrl: string;
};

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class TriggerMeetAnalysisUseCase {
  constructor(
    private readonly repo: MeetAnalysisRepository,
    private readonly agentPort: MeetAnalysisAgentPort,
  ) {}

  async execute(input: Input): Promise<Output> {
    const existing = await this.repo.findByActivityId(input.activityId);
    if (existing && existing.status !== "error") {
      return right({ analysisId: existing.id.toString() });
    }

    const jobId = existing?.jobId ?? new UniqueEntityID().toString();

    const analysis = MeetAnalysis.create({
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
      meetingDurationSeconds: input.meetingDurationSeconds,
      meetingDate: input.meetingDate?.toISOString(),
      meetingTitle: input.meetingTitle,
      lead: {
        id: input.leadId ?? "",
        businessName: input.leadBusinessName ?? "",
        description: input.leadDescription,
        segment: input.leadSegment,
        city: input.leadCity,
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
