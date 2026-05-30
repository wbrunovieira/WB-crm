import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryGatekeeperAnalysisRepository } from "../../fakes/in-memory-gatekeeper-analysis.repository";
import { FakeGatekeeperAnalysisAgentPort } from "../../fakes/fake-gatekeeper-analysis-agent.port";
import { TriggerGatekeeperAnalysisUseCase } from "@/domain/integrations/gatekeeper-analysis/application/use-cases/trigger-gatekeeper-analysis.use-case";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import type { ActivityAnalysisContext } from "@/domain/activities/application/repositories/activities.repository";

const makeInput = (overrides = {}) => ({
  activityId: "activity-1",
  ownerId: "user-1",
  webhookUrl: "https://api.crm.wbdigitalsolutions.com/webhooks/gatekeeper-analysis",
  ...overrides,
});

class FakeActivities {
  ctx: ActivityAnalysisContext | null = {
    subject: "Ligação gatekeeper",
    gotoTranscriptText: "Bom dia, aqui é Bruno da Salto...",
    gotoDuration: 120,
    dueDate: new Date("2026-05-01T10:00:00Z"),
    lead: { id: "lead-1", businessName: "Empresa X LTDA", segment: "Varejo", city: "São Paulo" },
    contact: { name: "Maria Santos", role: "Recepcionista" },
  };
  async findAnalysisContext() { return this.ctx; }
}

describe("TriggerGatekeeperAnalysisUseCase", () => {
  let repo: InMemoryGatekeeperAnalysisRepository;
  let agentPort: FakeGatekeeperAnalysisAgentPort;
  let activities: FakeActivities;
  let sut: TriggerGatekeeperAnalysisUseCase;

  beforeEach(() => {
    repo = new InMemoryGatekeeperAnalysisRepository();
    agentPort = new FakeGatekeeperAnalysisAgentPort();
    activities = new FakeActivities();
    sut = new TriggerGatekeeperAnalysisUseCase(repo, agentPort, activities as never);
  });

  it("returns left when the activity does not exist", async () => {
    activities.ctx = null;
    const result = await sut.execute(makeInput());
    expect(result.isLeft()).toBe(true);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("returns left when the activity has no transcript", async () => {
    activities.ctx = { ...activities.ctx!, gotoTranscriptText: null };
    const result = await sut.execute(makeInput());
    expect(result.isLeft()).toBe(true);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("creates analysis with pending status and calls agent", async () => {
    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);

    const saved = repo.items[0];
    expect(saved.status).toBe("pending");
    expect(saved.activityId).toBe("activity-1");
    expect(saved.ownerId).toBe("user-1");
    expect(saved.jobId).toBeTruthy();

    expect(agentPort.calls).toHaveLength(1);
    const call = agentPort.calls[0];
    expect(call.transcript).toBe("Bom dia, aqui é Bruno da Salto...");
    expect(call.lead.businessName).toBe("Empresa X LTDA");
    expect(call.contact?.name).toBe("Maria Santos");
    expect(call.webhookUrl).toContain("gatekeeper-analysis");
  });

  it("does not duplicate if already pending", async () => {
    const existing = GatekeeperAnalysis.create({
      activityId: "activity-1", ownerId: "user-1", status: "pending", jobId: "job-old",
    });
    await repo.save(existing);

    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.analysisId).toBe(existing.id.toString());
    expect(repo.items).toHaveLength(1);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("does not duplicate if already completed", async () => {
    const existing = GatekeeperAnalysis.create({
      activityId: "activity-1", ownerId: "user-1", status: "completed", jobId: "job-done", score: 4,
    });
    await repo.save(existing);

    await sut.execute(makeInput());

    expect(repo.items).toHaveLength(1);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("re-triggers if previous attempt errored", async () => {
    const existing = GatekeeperAnalysis.create({
      activityId: "activity-1", ownerId: "user-1", status: "error", jobId: "job-fail",
    });
    await repo.save(existing);

    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(agentPort.calls).toHaveLength(1);
  });

  it("passes callDate as ISO string to agent", async () => {
    const date = new Date("2026-05-01T10:00:00Z");
    await sut.execute(makeInput({ callDate: date }));
    expect(agentPort.calls[0].callDate).toBe(date.toISOString());
  });
});
