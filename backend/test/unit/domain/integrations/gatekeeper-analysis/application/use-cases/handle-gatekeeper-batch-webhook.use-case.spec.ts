import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryGatekeeperBatchRepository } from "../../fakes/in-memory-gatekeeper-batch.repository";
import { HandleGatekeeperBatchWebhookUseCase } from "@/domain/integrations/gatekeeper-analysis/application/use-cases/handle-gatekeeper-batch-webhook.use-case";
import { GatekeeperBatch } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-batch.entity";

const pendingBatch = (jobId = "batch-001") =>
  GatekeeperBatch.create({
    ownerId: "user-1", status: "pending", jobId, analysisIds: JSON.stringify(["a1", "a2"]),
  });

describe("HandleGatekeeperBatchWebhookUseCase", () => {
  let repo: InMemoryGatekeeperBatchRepository;
  let sut: HandleGatekeeperBatchWebhookUseCase;

  beforeEach(() => {
    repo = new InMemoryGatekeeperBatchRepository();
    sut = new HandleGatekeeperBatchWebhookUseCase(repo);
  });

  it("completes batch with full report fields", async () => {
    await repo.save(pendingBatch("batch-001"));

    const result = await sut.execute({
      batchJobId: "batch-001",
      status: "completed",
      overallScore: 3.4,
      dimensionAverages: { recepcao: 3.8, alianca: 3.2, perguntas: 3.6, objecoes: 2.4, resultado: 3.1, tecnicas: 3.0 },
      patterns: {
        working: ["Uso do nome do GK na abertura"],
        notWorking: ["Revelar demais ao 'do que se trata?'"],
        keepDoing: ["Tom calmo e respeitoso"],
      },
      comparisonWithHistory: {
        improved: ["Aliança com GK melhorou"],
        worsened: ["Score de objeções caiu"],
        unchanged: ["Tom de abertura estável"],
        firstBatch: false,
      },
      individualHighlights: [
        { activityId: "act-1", score: 4.5, highlight: "Melhor ligação — conseguiu transferência" },
      ],
      recommendations: ["Treinar resposta ao 'do que se trata?'"],
      newSummary: "Lote de 2 ligações. Score médio 3.4. Principal problema: objeções.",
      positivePoints: ["Rapport melhorando"],
      improvementPoints: ["Respostas a objeções ainda fracas"],
    });

    expect(result.isRight()).toBe(true);

    const saved = repo.items[0];
    expect(saved.status).toBe("completed");
    expect(saved.overallScore).toBe(3.4);
    expect(saved.newSummary).toContain("3.4");

    const patterns = JSON.parse(saved.patterns!);
    expect(patterns.working).toHaveLength(1);
    expect(patterns.notWorking).toHaveLength(1);

    const comparison = JSON.parse(saved.comparisonWithHistory!);
    expect(comparison.improved).toHaveLength(1);
    expect(comparison.firstBatch).toBe(false);

    const highlights = JSON.parse(saved.individualHighlights!);
    expect(highlights[0].score).toBe(4.5);

    const dimAvg = JSON.parse(saved.dimensionAverages!);
    expect(dimAvg.recepcao).toBe(3.8);
    expect(dimAvg.objecoes).toBe(2.4);
  });

  it("marks as error on error webhook", async () => {
    await repo.save(pendingBatch("batch-002"));
    await sut.execute({ batchJobId: "batch-002", status: "error", error: "Timeout" });
    expect(repo.items[0].status).toBe("error");
    expect(repo.items[0].errorMsg).toBe("Timeout");
  });

  it("returns left when batchJobId not found", async () => {
    const result = await sut.execute({ batchJobId: "nonexistent", status: "completed" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("não encontrado");
  });

  it("marks firstBatch correctly when no history", async () => {
    await repo.save(pendingBatch("batch-003"));
    await sut.execute({
      batchJobId: "batch-003",
      status: "completed",
      overallScore: 3.0,
      comparisonWithHistory: { improved: [], worsened: [], unchanged: [], firstBatch: true },
      newSummary: "Primeiro lote analisado.",
    });
    const saved = repo.items[0];
    const comparison = JSON.parse(saved.comparisonWithHistory!);
    expect(comparison.firstBatch).toBe(true);
  });
});
