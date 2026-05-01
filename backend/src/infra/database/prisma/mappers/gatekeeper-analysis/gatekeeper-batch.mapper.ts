import type { GatekeeperBatch as PrismaGatekeeperBatch } from "@prisma/client";
import { GatekeeperBatch } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-batch.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class GatekeeperBatchMapper {
  static toDomain(raw: PrismaGatekeeperBatch): GatekeeperBatch {
    return GatekeeperBatch.create(
      {
        ownerId: raw.ownerId,
        status: raw.status,
        jobId: raw.jobId ?? undefined,
        errorMsg: raw.errorMsg ?? undefined,
        analysisIds: raw.analysisIds ?? undefined,
        overallScore: raw.overallScore ?? undefined,
        dimensionAverages: raw.dimensionAverages ?? undefined,
        patterns: raw.patterns ?? undefined,
        comparisonWithHistory: raw.comparisonWithHistory ?? undefined,
        individualHighlights: raw.individualHighlights ?? undefined,
        recommendations: raw.recommendations ?? undefined,
        newSummary: raw.newSummary ?? undefined,
        positivePoints: raw.positivePoints ?? undefined,
        improvementPoints: raw.improvementPoints ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(
    batch: GatekeeperBatch,
  ): Omit<PrismaGatekeeperBatch, "createdAt" | "updatedAt"> & { createdAt?: Date; updatedAt?: Date } {
    return {
      id: batch.id.toString(),
      ownerId: batch.ownerId,
      status: batch.status,
      jobId: batch.jobId ?? null,
      errorMsg: batch.errorMsg ?? null,
      analysisIds: batch.analysisIds ?? null,
      overallScore: batch.overallScore ?? null,
      dimensionAverages: batch.dimensionAverages ?? null,
      patterns: batch.patterns ?? null,
      comparisonWithHistory: batch.comparisonWithHistory ?? null,
      individualHighlights: batch.individualHighlights ?? null,
      recommendations: batch.recommendations ?? null,
      newSummary: batch.newSummary ?? null,
      positivePoints: batch.positivePoints ?? null,
      improvementPoints: batch.improvementPoints ?? null,
    };
  }
}
