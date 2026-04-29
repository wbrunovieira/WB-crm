import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { CallAnalysisRepository } from "../repositories/call-analysis.repository";

export interface CallAnalysisWebhookPayload {
  jobId: string;
  status: "completed" | "error";
  error?: string;
  score?: number;
  noShowRisk?: string;
  noShowRiskText?: string;
  summary?: string;
  spiced?: {
    situation?: { text: string; score?: number };
    pain?: { text: string; score?: number };
    impact?: { text: string; score?: number };
    criticalEvent?: { text: string; score?: number };
    evidence?: { text: string; score?: number };
  };
  microPactos?: Array<{
    id: number;
    label: string;
    spicedDimension: string;
    achieved: boolean;
    notes: string;
  }>;
  schedulingTechniques?: {
    gatilhoDor?: { used: boolean; notes: string };
    escolhaAlternativa?: { used: boolean; notes: string };
    compromissoVerbalShow?: { used: boolean; notes: string };
    compromissoEmergencia?: { used: boolean; notes: string };
  };
  microAnalysis?: Array<{ timestamp: string; text: string; type: string }>;
  positivePoints?: string[];
  improvementPoints?: string[];
}

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class HandleCallAnalysisWebhookUseCase {
  constructor(private readonly repo: CallAnalysisRepository) {}

  async execute(payload: CallAnalysisWebhookPayload): Promise<Output> {
    const analysis = await this.repo.findByJobId(payload.jobId);
    if (!analysis) {
      return left(new Error(`CallAnalysis com jobId "${payload.jobId}" não encontrada`));
    }

    if (payload.status === "error") {
      analysis.complete({
        status: "error",
        errorMsg: payload.error ?? "Erro desconhecido",
      });
      await this.repo.save(analysis);
      return right({ analysisId: analysis.id.toString() });
    }

    analysis.complete({
      status: "completed",
      score: payload.score,
      noShowRisk: payload.noShowRisk,
      noShowRiskText: payload.noShowRiskText,
      summary: payload.summary,
      spicedSituation: payload.spiced?.situation
        ? JSON.stringify(payload.spiced.situation)
        : undefined,
      spicedPain: payload.spiced?.pain
        ? JSON.stringify(payload.spiced.pain)
        : undefined,
      spicedImpact: payload.spiced?.impact
        ? JSON.stringify(payload.spiced.impact)
        : undefined,
      spicedCritical: payload.spiced?.criticalEvent
        ? JSON.stringify(payload.spiced.criticalEvent)
        : undefined,
      spicedEvidence: payload.spiced?.evidence
        ? JSON.stringify(payload.spiced.evidence)
        : undefined,
      microPactos: payload.microPactos
        ? JSON.stringify(payload.microPactos)
        : undefined,
      schedulingTechniques: payload.schedulingTechniques
        ? JSON.stringify(payload.schedulingTechniques)
        : undefined,
      microAnalysis: payload.microAnalysis
        ? JSON.stringify(payload.microAnalysis)
        : undefined,
      positivePoints: payload.positivePoints
        ? JSON.stringify(payload.positivePoints)
        : undefined,
      improvementPoints: payload.improvementPoints
        ? JSON.stringify(payload.improvementPoints)
        : undefined,
    });

    await this.repo.save(analysis);
    return right({ analysisId: analysis.id.toString() });
  }
}
