import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { GatekeeperAnalysis } from "../../enterprise/entities/gatekeeper-analysis.entity";
import { GatekeeperAnalysisRepository } from "../repositories/gatekeeper-analysis.repository";
import { GatekeeperAnalysisAgentPort } from "../ports/gatekeeper-analysis-agent.port";

type Input = {
  activityId: string;
  activitySubject: string;
  transcript: string;
  callDurationSeconds?: number;
  callDate?: Date;
  leadId?: string;
  leadBusinessName?: string;
  leadSegment?: string;
  leadCity?: string;
  contactName?: string;
  contactRole?: string;
  ownerId: string;
  webhookUrl: string;
};

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class TriggerGatekeeperAnalysisUseCase {
  constructor(
    private readonly repo: GatekeeperAnalysisRepository,
    private readonly agentPort: GatekeeperAnalysisAgentPort,
  ) {}

  async execute(input: Input): Promise<Output> {
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
      transcript: input.transcript,
      callDurationSeconds: input.callDurationSeconds,
      callDate: input.callDate?.toISOString(),
      lead: {
        id: input.leadId ?? "",
        businessName: input.leadBusinessName ?? "",
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
      },
    });

    return right({ analysisId: analysis.id.toString() });
  }
}
