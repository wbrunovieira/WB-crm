import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { GatekeeperBatch } from "../../enterprise/entities/gatekeeper-batch.entity";
import { GatekeeperAnalysisRepository } from "../repositories/gatekeeper-analysis.repository";
import { GatekeeperBatchRepository } from "../repositories/gatekeeper-batch.repository";
import { GatekeeperBatchAgentPort } from "../ports/gatekeeper-batch-agent.port";

type Input = {
  ownerId: string;
  analysisIds: string[];
  webhookUrl: string;
};

type Output = Either<Error, { batchId: string }>;

@Injectable()
export class TriggerGatekeeperBatchUseCase {
  constructor(
    private readonly analysisRepo: GatekeeperAnalysisRepository,
    private readonly batchRepo: GatekeeperBatchRepository,
    private readonly agentPort: GatekeeperBatchAgentPort,
  ) {}

  async execute(input: Input): Promise<Output> {
    const analyses = await this.analysisRepo.findByIds(input.analysisIds);

    for (const id of input.analysisIds) {
      const found = analyses.find((a) => a.id.toString() === id);
      if (!found) {
        return left(new Error(`GatekeeperAnalysis "${id}" não encontrada`));
      }
      if (found.status !== "completed") {
        return left(new Error(`GatekeeperAnalysis "${id}" não está concluída`));
      }
    }

    const historicalBatches = await this.batchRepo.findCompletedSummaries(input.ownerId);

    const batchJobId = new UniqueEntityID().toString();

    const batch = GatekeeperBatch.create({
      ownerId: input.ownerId,
      status: "pending",
      jobId: batchJobId,
      analysisIds: JSON.stringify(input.analysisIds),
    });

    await this.batchRepo.save(batch);

    await this.agentPort.request({
      batchJobId,
      webhookUrl: input.webhookUrl,
      analyses: analyses.map((a) => ({
        activityId: a.activityId,
        score: a.score,
        summary: a.summary,
        raportRecepcao: a.raportRecepcao ? JSON.parse(a.raportRecepcao) : undefined,
        raportAlianca: a.raportAlianca ? JSON.parse(a.raportAlianca) : undefined,
        raportPerguntas: a.raportPerguntas ? JSON.parse(a.raportPerguntas) : undefined,
        raportObjecoes: a.raportObjecoes ? JSON.parse(a.raportObjecoes) : undefined,
        raportResultado: a.raportResultado ? JSON.parse(a.raportResultado) : undefined,
        raportTecnicas: a.raportTecnicas ? JSON.parse(a.raportTecnicas) : undefined,
      })),
      historicalSummaries: historicalBatches.map((b) => ({
        date: b.createdAt?.toISOString(),
        summary: b.newSummary!,
        overallScore: b.overallScore,
      })),
    });

    return right({ batchId: batch.id.toString() });
  }
}
