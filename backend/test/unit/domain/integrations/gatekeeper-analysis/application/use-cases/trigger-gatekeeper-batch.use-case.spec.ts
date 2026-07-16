import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryGatekeeperAnalysisRepository } from "../../fakes/in-memory-gatekeeper-analysis.repository";
import { InMemoryGatekeeperBatchRepository } from "../../fakes/in-memory-gatekeeper-batch.repository";
import { FakeGatekeeperBatchAgentPort } from "../../fakes/fake-gatekeeper-batch-agent.port";
import { TriggerGatekeeperBatchUseCase } from "@/domain/integrations/gatekeeper-analysis/application/use-cases/trigger-gatekeeper-batch.use-case";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import { GatekeeperBatch } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-batch.entity";

function makeCompletedAnalysis(activityId: string, score = 3.5) {
  const a = GatekeeperAnalysis.create({
    activityId,
    ownerId: "user-1",
    status: "completed",
    jobId: `job-${activityId}`,
    score,
    summary: `Resumo de ${activityId}`,
    raportRecepcao: JSON.stringify({ text: "Ok", score: 4 }),
    raportResultado: JSON.stringify({ text: "Obteve nome", score: 3, outcome: "got_name" }),
  });
  return a;
}

describe("TriggerGatekeeperBatchUseCase", () => {
  let analysisRepo: InMemoryGatekeeperAnalysisRepository;
  let batchRepo: InMemoryGatekeeperBatchRepository;
  let agentPort: FakeGatekeeperBatchAgentPort;
  let sut: TriggerGatekeeperBatchUseCase;

  beforeEach(() => {
    analysisRepo = new InMemoryGatekeeperAnalysisRepository();
    batchRepo = new InMemoryGatekeeperBatchRepository();
    agentPort = new FakeGatekeeperBatchAgentPort();
    sut = new TriggerGatekeeperBatchUseCase(analysisRepo, batchRepo, agentPort);
  });

  it("creates batch and calls agent with analyses data", async () => {
    const a1 = makeCompletedAnalysis("act-1", 4.0);
    const a2 = makeCompletedAnalysis("act-2", 3.0);
    await analysisRepo.save(a1);
    await analysisRepo.save(a2);

    const result = await sut.execute({
      ownerId: "user-1",
      analysisIds: [a1.id.toString(), a2.id.toString()],
      webhookUrl: "https://crm-api.wbdigitalsolutions.com/webhooks/gatekeeper-batch",
    });

    expect(result.isRight()).toBe(true);
    expect(batchRepo.items).toHaveLength(1);

    const batch = batchRepo.items[0];
    expect(batch.status).toBe("pending");
    expect(batch.ownerId).toBe("user-1");
    expect(JSON.parse(batch.analysisIds!)).toHaveLength(2);

    expect(agentPort.calls).toHaveLength(1);
    const call = agentPort.calls[0];
    expect(call.analyses).toHaveLength(2);
    expect(call.analyses[0].score).toBe(4.0);
    expect(call.historicalSummaries).toHaveLength(0);
    expect(call.webhookUrl).toContain("gatekeeper-batch");
  });

  it("includes historical summaries from previous completed batches", async () => {
    const prevBatch = GatekeeperBatch.create({
      ownerId: "user-1",
      status: "completed",
      jobId: "batch-old",
      newSummary: "Resumo do lote anterior.",
      overallScore: 3.2,
      analysisIds: JSON.stringify([]),
      createdAt: new Date("2026-04-01"),
    });
    await batchRepo.save(prevBatch);

    const a = makeCompletedAnalysis("act-1");
    await analysisRepo.save(a);

    const result = await sut.execute({
      ownerId: "user-1",
      analysisIds: [a.id.toString()],
      webhookUrl: "https://...",
    });

    expect(result.isRight()).toBe(true);
    expect(agentPort.calls[0].historicalSummaries).toHaveLength(1);
    expect(agentPort.calls[0].historicalSummaries[0].summary).toBe("Resumo do lote anterior.");
  });

  it("returns left if analysis not found", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      analysisIds: ["nonexistent-id"],
      webhookUrl: "https://...",
    });
    expect(result.isLeft()).toBe(true);
  });

  it("returns left if analysis not completed", async () => {
    const a = GatekeeperAnalysis.create({
      activityId: "act-1", ownerId: "user-1", status: "pending", jobId: "j1",
    });
    await analysisRepo.save(a);

    const result = await sut.execute({
      ownerId: "user-1",
      analysisIds: [a.id.toString()],
      webhookUrl: "https://...",
    });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("concluída");
  });
});
