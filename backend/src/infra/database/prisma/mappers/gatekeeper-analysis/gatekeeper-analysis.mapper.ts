import type { GatekeeperAnalysis as PrismaGatekeeperAnalysis } from "@prisma/client";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

export class GatekeeperAnalysisMapper {
  static toDomain(raw: PrismaGatekeeperAnalysis): GatekeeperAnalysis {
    return GatekeeperAnalysis.create(
      {
        activityId: raw.activityId,
        ownerId: raw.ownerId,
        score: raw.score ?? undefined,
        summary: raw.summary ?? undefined,
        status: raw.status,
        errorMsg: raw.errorMsg ?? undefined,
        jobId: raw.jobId ?? undefined,
        raportRecepcao: raw.raportRecepcao ?? undefined,
        raportAlianca: raw.raportAlianca ?? undefined,
        raportPerguntas: raw.raportPerguntas ?? undefined,
        raportObjecoes: raw.raportObjecoes ?? undefined,
        raportResultado: raw.raportResultado ?? undefined,
        raportTecnicas: raw.raportTecnicas ?? undefined,
        positivePoints: raw.positivePoints ?? undefined,
        improvementPoints: raw.improvementPoints ?? undefined,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
      new UniqueEntityID(raw.id),
    );
  }

  static toPrisma(
    analysis: GatekeeperAnalysis,
  ): Omit<PrismaGatekeeperAnalysis, "createdAt" | "updatedAt"> & { createdAt?: Date; updatedAt?: Date } {
    return {
      id: analysis.id.toString(),
      activityId: analysis.activityId,
      ownerId: analysis.ownerId,
      score: analysis.score ?? null,
      summary: analysis.summary ?? null,
      status: analysis.status,
      errorMsg: analysis.errorMsg ?? null,
      jobId: analysis.jobId ?? null,
      raportRecepcao: analysis.raportRecepcao ?? null,
      raportAlianca: analysis.raportAlianca ?? null,
      raportPerguntas: analysis.raportPerguntas ?? null,
      raportObjecoes: analysis.raportObjecoes ?? null,
      raportResultado: analysis.raportResultado ?? null,
      raportTecnicas: analysis.raportTecnicas ?? null,
      positivePoints: analysis.positivePoints ?? null,
      improvementPoints: analysis.improvementPoints ?? null,
    };
  }
}
