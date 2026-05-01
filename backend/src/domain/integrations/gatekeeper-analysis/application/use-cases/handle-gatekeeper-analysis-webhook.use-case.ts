import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { GatekeeperAnalysisRepository } from "../repositories/gatekeeper-analysis.repository";

interface RaportDimensionBase {
  text?: string;
  score?: number;
}

interface RaportRecepcao extends RaportDimensionBase {}
interface RaportAlianca extends RaportDimensionBase {
  usedGKName?: boolean;
  connectionMoments?: string[];
}
interface RaportPerguntas extends RaportDimensionBase {
  questionsAsked?: string[];
}
interface RaportObjecoes extends RaportDimensionBase {
  objectionsReceived?: string[];
  responsesGiven?: string[];
}
interface RaportResultado extends RaportDimensionBase {
  outcome?: string;
  obtained?: string[];
  nextAttemptTip?: string;
}
interface RaportTecnicas extends RaportDimensionBase {
  techniquesUsed?: string[];
}

export interface GatekeeperAnalysisWebhookPayload {
  jobId: string;
  status: "completed" | "error";
  error?: string;
  score?: number;
  summary?: string;
  raport?: {
    recepcao?: RaportRecepcao;
    alianca?: RaportAlianca;
    perguntas?: RaportPerguntas;
    objecoes?: RaportObjecoes;
    resultado?: RaportResultado;
    tecnicas?: RaportTecnicas;
  };
  positivePoints?: string[];
  improvementPoints?: string[];
}

type Output = Either<Error, { analysisId: string }>;

@Injectable()
export class HandleGatekeeperAnalysisWebhookUseCase {
  constructor(private readonly repo: GatekeeperAnalysisRepository) {}

  async execute(payload: GatekeeperAnalysisWebhookPayload): Promise<Output> {
    const analysis = await this.repo.findByJobId(payload.jobId);
    if (!analysis) {
      return left(new Error(`GatekeeperAnalysis com jobId "${payload.jobId}" não encontrada`));
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
      raportRecepcao: payload.raport?.recepcao ? JSON.stringify(payload.raport.recepcao) : undefined,
      raportAlianca: payload.raport?.alianca ? JSON.stringify(payload.raport.alianca) : undefined,
      raportPerguntas: payload.raport?.perguntas ? JSON.stringify(payload.raport.perguntas) : undefined,
      raportObjecoes: payload.raport?.objecoes ? JSON.stringify(payload.raport.objecoes) : undefined,
      raportResultado: payload.raport?.resultado ? JSON.stringify(payload.raport.resultado) : undefined,
      raportTecnicas: payload.raport?.tecnicas ? JSON.stringify(payload.raport.tecnicas) : undefined,
      positivePoints: payload.positivePoints ? JSON.stringify(payload.positivePoints) : undefined,
      improvementPoints: payload.improvementPoints ? JSON.stringify(payload.improvementPoints) : undefined,
    });

    await this.repo.save(analysis);
    return right({ analysisId: analysis.id.toString() });
  }
}
