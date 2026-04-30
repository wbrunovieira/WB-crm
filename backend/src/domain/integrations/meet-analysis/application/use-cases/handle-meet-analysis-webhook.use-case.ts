import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { MeetAnalysisRepository } from "../repositories/meet-analysis.repository";

export interface DiagGapEntry {
  identified: boolean;
  text: string | null;
  severity: "high" | "medium" | "low" | null;
}

export interface MeetAnalysisWebhookPayload {
  jobId: string;
  status: "completed" | "error";
  error?: string;
  score?: number;
  summary?: string;
  nextStep?: string;
  diag?: {
    business?: {
      currentRevenue?: string;
      model?: string;
      customers?: string;
      averageTicket?: string;
      objective?: string;
      alreadyTried?: string;
      text?: string;
      score?: number;
    };
    gaps?: {
      aquisicao?: DiagGapEntry;
      funil?: DiagGapEntry;
      oferta?: DiagGapEntry;
      timeComercial?: DiagGapEntry;
      retencao?: DiagGapEntry;
      dados?: DiagGapEntry;
      text?: string;
      score?: number;
    };
    urgency?: {
      trigger?: string;
      criticalEvent?: string;
      consequence?: string;
      text?: string;
      score?: number;
    };
    decisionPower?: {
      decisionMaker?: string;
      buyingProcess?: string;
      budget?: string;
      text?: string;
      score?: number;
    };
    engagement?: {
      level?: "high" | "medium" | "low";
      buyerQuestions?: string[];
      resistances?: string[];
      rapport?: string;
      text?: string;
      score?: number;
    };
    closing?: {
      buyerSignals?: string[];
      sellerCloses?: {
        trialClose?: { used: boolean; notes: string | null };
        nextStepAnchor?: { used: boolean; notes: string | null };
        urgencyCreation?: { used: boolean; notes: string | null };
      };
      closingProbability?: number;
      text?: string;
      score?: number;
    };
  };
  positivePoints?: string[];
  improvementPoints?: string[];
}

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class HandleMeetAnalysisWebhookUseCase {
  constructor(private readonly repo: MeetAnalysisRepository) {}

  async execute(payload: MeetAnalysisWebhookPayload): Promise<Output> {
    const analysis = await this.repo.findByJobId(payload.jobId);
    if (!analysis) {
      return left(new Error(`MeetAnalysis com jobId "${payload.jobId}" não encontrada`));
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
      summary: payload.summary,
      nextStep: payload.nextStep,
      diagBusiness: payload.diag?.business
        ? JSON.stringify(payload.diag.business)
        : undefined,
      diagGaps: payload.diag?.gaps
        ? JSON.stringify(payload.diag.gaps)
        : undefined,
      diagUrgency: payload.diag?.urgency
        ? JSON.stringify(payload.diag.urgency)
        : undefined,
      diagDecisionPower: payload.diag?.decisionPower
        ? JSON.stringify(payload.diag.decisionPower)
        : undefined,
      diagEngagement: payload.diag?.engagement
        ? JSON.stringify(payload.diag.engagement)
        : undefined,
      diagClosing: payload.diag?.closing
        ? JSON.stringify(payload.diag.closing)
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
