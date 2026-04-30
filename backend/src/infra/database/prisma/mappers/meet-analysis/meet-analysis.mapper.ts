import type { MeetAnalysis as PrismaMeetAnalysis } from "@prisma/client";
import { MeetAnalysis } from "@/domain/integrations/meet-analysis/enterprise/entities/meet-analysis.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class MeetAnalysisMapper {
  static toDomain(raw: PrismaMeetAnalysis): MeetAnalysis {
    return MeetAnalysis.create(
      {
        activityId: raw.activityId,
        leadId: raw.leadId ?? undefined,
        ownerId: raw.ownerId,
        score: raw.score ?? undefined,
        summary: raw.summary ?? undefined,
        nextStep: raw.nextStep ?? undefined,
        status: raw.status,
        errorMsg: raw.errorMsg ?? undefined,
        jobId: raw.jobId ?? undefined,
        diagBusiness: raw.diagBusiness ?? undefined,
        diagGaps: raw.diagGaps ?? undefined,
        diagUrgency: raw.diagUrgency ?? undefined,
        diagDecisionPower: raw.diagDecisionPower ?? undefined,
        diagEngagement: raw.diagEngagement ?? undefined,
        diagClosing: raw.diagClosing ?? undefined,
        positivePoints: raw.positivePoints ?? undefined,
        improvementPoints: raw.improvementPoints ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(
    analysis: MeetAnalysis,
  ): Omit<PrismaMeetAnalysis, "createdAt" | "updatedAt"> & { createdAt?: Date; updatedAt?: Date } {
    return {
      id: analysis.id.toString(),
      activityId: analysis.activityId,
      leadId: analysis.leadId ?? null,
      ownerId: analysis.ownerId,
      score: analysis.score ?? null,
      summary: analysis.summary ?? null,
      nextStep: analysis.nextStep ?? null,
      status: analysis.status,
      errorMsg: analysis.errorMsg ?? null,
      jobId: analysis.jobId ?? null,
      diagBusiness: analysis.diagBusiness ?? null,
      diagGaps: analysis.diagGaps ?? null,
      diagUrgency: analysis.diagUrgency ?? null,
      diagDecisionPower: analysis.diagDecisionPower ?? null,
      diagEngagement: analysis.diagEngagement ?? null,
      diagClosing: analysis.diagClosing ?? null,
      positivePoints: analysis.positivePoints ?? null,
      improvementPoints: analysis.improvementPoints ?? null,
    };
  }
}
