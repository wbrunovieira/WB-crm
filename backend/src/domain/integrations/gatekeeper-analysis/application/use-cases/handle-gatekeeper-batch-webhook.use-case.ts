import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { GatekeeperBatchRepository } from "../repositories/gatekeeper-batch.repository";

export interface GatekeeperBatchWebhookPayload {
  batchJobId: string;
  status: "completed" | "error";
  error?: string;
  overallScore?: number;
  dimensionAverages?: {
    recepcao?: number;
    alianca?: number;
    perguntas?: number;
    objecoes?: number;
    resultado?: number;
    tecnicas?: number;
  };
  patterns?: {
    working?: string[];
    notWorking?: string[];
    keepDoing?: string[];
  };
  comparisonWithHistory?: {
    improved?: string[];
    worsened?: string[];
    unchanged?: string[];
    firstBatch?: boolean;
  };
  individualHighlights?: Array<{
    activityId: string;
    score?: number;
    highlight?: string;
  }>;
  recommendations?: string[];
  newSummary?: string;
  positivePoints?: string[];
  improvementPoints?: string[];
}

type Output = Either<Error, { batchId: string }>;

@Injectable()
export class HandleGatekeeperBatchWebhookUseCase {
  constructor(private readonly repo: GatekeeperBatchRepository) {}

  async execute(payload: GatekeeperBatchWebhookPayload): Promise<Output> {
    const batch = await this.repo.findByJobId(payload.batchJobId);
    if (!batch) {
      return left(new Error(`GatekeeperBatch com jobId "${payload.batchJobId}" não encontrado`));
    }

    if (payload.status === "error") {
      batch.complete({
        status: "error",
        errorMsg: payload.error ?? "Erro desconhecido",
      });
      await this.repo.save(batch);
      return right({ batchId: batch.id.toString() });
    }

    batch.complete({
      status: "completed",
      overallScore: payload.overallScore,
      dimensionAverages: payload.dimensionAverages ? JSON.stringify(payload.dimensionAverages) : undefined,
      patterns: payload.patterns ? JSON.stringify(payload.patterns) : undefined,
      comparisonWithHistory: payload.comparisonWithHistory ? JSON.stringify(payload.comparisonWithHistory) : undefined,
      individualHighlights: payload.individualHighlights ? JSON.stringify(payload.individualHighlights) : undefined,
      recommendations: payload.recommendations ? JSON.stringify(payload.recommendations) : undefined,
      newSummary: payload.newSummary,
      positivePoints: payload.positivePoints ? JSON.stringify(payload.positivePoints) : undefined,
      improvementPoints: payload.improvementPoints ? JSON.stringify(payload.improvementPoints) : undefined,
    });

    await this.repo.save(batch);
    return right({ batchId: batch.id.toString() });
  }
}
