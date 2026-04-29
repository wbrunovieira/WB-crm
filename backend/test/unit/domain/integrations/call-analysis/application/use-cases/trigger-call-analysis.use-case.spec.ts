import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCallAnalysisRepository } from "../../fakes/in-memory-call-analysis.repository";
import { FakeCallAnalysisAgentPort } from "../../fakes/fake-call-analysis-agent.port";
import { TriggerCallAnalysisUseCase } from "@/domain/integrations/call-analysis/application/use-cases/trigger-call-analysis.use-case";
import { CallAnalysis } from "@/domain/integrations/call-analysis/enterprise/entities/call-analysis.entity";

const makeInput = (overrides: Partial<Parameters<TriggerCallAnalysisUseCase["execute"]>[0]> = {}) => ({
  activityId: "activity-1",
  activitySubject: "Reunião com cliente",
  activityNotes: "Ligação de apresentação",
  transcript: "Olá, como posso ajudar? ...",
  callDurationSeconds: 300,
  callDate: new Date("2024-01-15T10:00:00Z"),
  leadId: "lead-1",
  leadBusinessName: "Empresa Teste LTDA",
  leadDescription: "Empresa de tecnologia",
  leadSegment: "Tecnologia",
  leadCity: "São Paulo",
  leadActivities: "Desenvolvimento de software",
  contactName: "João Silva",
  contactRole: "CEO",
  ownerId: "user-1",
  webhookUrl: "https://crm.example.com/webhooks/call-analysis",
  ...overrides,
});

describe("TriggerCallAnalysisUseCase", () => {
  let repo: InMemoryCallAnalysisRepository;
  let agentPort: FakeCallAnalysisAgentPort;
  let sut: TriggerCallAnalysisUseCase;

  beforeEach(() => {
    repo = new InMemoryCallAnalysisRepository();
    agentPort = new FakeCallAnalysisAgentPort();
    sut = new TriggerCallAnalysisUseCase(repo, agentPort);
  });

  it("creates analysis and calls agent", async () => {
    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);

    const saved = repo.items[0];
    expect(saved.status).toBe("pending");
    expect(saved.activityId).toBe("activity-1");
    expect(saved.leadId).toBe("lead-1");
    expect(saved.ownerId).toBe("user-1");
    expect(saved.jobId).toBeTruthy();

    expect(agentPort.calls).toHaveLength(1);
    const call = agentPort.calls[0];
    expect(call.transcript).toBe("Olá, como posso ajudar? ...");
    expect(call.lead.businessName).toBe("Empresa Teste LTDA");
    expect(call.contact?.name).toBe("João Silva");
    expect(call.activity.subject).toBe("Reunião com cliente");
    expect(call.webhookUrl).toBe("https://crm.example.com/webhooks/call-analysis");
  });

  it("does not duplicate if analysis already pending for activity", async () => {
    // Save an existing pending analysis for the same activity
    const existing = CallAnalysis.create({
      activityId: "activity-1",
      ownerId: "user-1",
      status: "pending",
      jobId: "existing-job-id",
    });
    await repo.save(existing);

    // Trigger again for same activity
    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    // Should return the existing one
    if (result.isRight()) {
      expect(result.value.analysisId).toBe(existing.id.toString());
    }
    // No new record created
    expect(repo.items).toHaveLength(1);
    // Agent was NOT called again
    expect(agentPort.calls).toHaveLength(0);
  });

  it("does not duplicate if analysis already completed for activity", async () => {
    const existing = CallAnalysis.create({
      activityId: "activity-1",
      ownerId: "user-1",
      status: "completed",
      jobId: "completed-job-id",
      score: 8.5,
    });
    await repo.save(existing);

    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("re-triggers analysis if previous attempt errored", async () => {
    const existing = CallAnalysis.create({
      activityId: "activity-1",
      ownerId: "user-1",
      status: "error",
      jobId: "failed-job-id",
      errorMsg: "Timeout",
    });
    await repo.save(existing);

    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    // A new record replaces or is created
    expect(agentPort.calls).toHaveLength(1);
  });

  it("passes callDate as ISO string to agent", async () => {
    const date = new Date("2024-06-01T14:30:00Z");
    await sut.execute(makeInput({ callDate: date }));

    expect(agentPort.calls[0].callDate).toBe(date.toISOString());
  });

  it("passes callDurationSeconds to agent", async () => {
    await sut.execute(makeInput({ callDurationSeconds: 600 }));
    expect(agentPort.calls[0].callDurationSeconds).toBe(600);
  });
});
