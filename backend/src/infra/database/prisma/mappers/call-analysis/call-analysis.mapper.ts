import type { CallAnalysis as PrismaCallAnalysis } from "@prisma/client";
import { CallAnalysis } from "@/domain/integrations/call-analysis/enterprise/entities/call-analysis.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class CallAnalysisMapper {
  static toDomain(raw: PrismaCallAnalysis): CallAnalysis {
    return CallAnalysis.create(
      {
        activityId: raw.activityId,
        leadId: raw.leadId ?? undefined,
        ownerId: raw.ownerId,
        score: raw.score ?? undefined,
        noShowRisk: raw.noShowRisk ?? undefined,
        noShowRiskText: raw.noShowRiskText ?? undefined,
        summary: raw.summary ?? undefined,
        status: raw.status,
        errorMsg: raw.errorMsg ?? undefined,
        jobId: raw.jobId ?? undefined,
        spicedSituation: raw.spicedSituation ?? undefined,
        spicedPain: raw.spicedPain ?? undefined,
        spicedImpact: raw.spicedImpact ?? undefined,
        spicedCritical: raw.spicedCritical ?? undefined,
        spicedEvidence: raw.spicedEvidence ?? undefined,
        microPactos: raw.microPactos ?? undefined,
        schedulingTechniques: raw.schedulingTechniques ?? undefined,
        microAnalysis: raw.microAnalysis ?? undefined,
        positivePoints: raw.positivePoints ?? undefined,
        improvementPoints: raw.improvementPoints ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(analysis: CallAnalysis): Omit<PrismaCallAnalysis, "createdAt" | "updatedAt"> & {
    createdAt?: Date;
    updatedAt?: Date;
  } {
    return {
      id: analysis.id.toString(),
      activityId: analysis.activityId,
      leadId: analysis.leadId ?? null,
      ownerId: analysis.ownerId,
      score: analysis.score ?? null,
      noShowRisk: analysis.noShowRisk ?? null,
      noShowRiskText: analysis.noShowRiskText ?? null,
      summary: analysis.summary ?? null,
      status: analysis.status,
      errorMsg: analysis.errorMsg ?? null,
      jobId: analysis.jobId ?? null,
      spicedSituation: analysis.spicedSituation ?? null,
      spicedPain: analysis.spicedPain ?? null,
      spicedImpact: analysis.spicedImpact ?? null,
      spicedCritical: analysis.spicedCritical ?? null,
      spicedEvidence: analysis.spicedEvidence ?? null,
      microPactos: analysis.microPactos ?? null,
      schedulingTechniques: analysis.schedulingTechniques ?? null,
      microAnalysis: analysis.microAnalysis ?? null,
      positivePoints: analysis.positivePoints ?? null,
      improvementPoints: analysis.improvementPoints ?? null,
    };
  }
}
