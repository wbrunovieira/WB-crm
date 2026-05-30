import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryGatekeeperAnalysisRepository } from "../../../gatekeeper-analysis/fakes/in-memory-gatekeeper-analysis.repository";
import { InMemoryCallAnalysisRepository } from "../../../call-analysis/fakes/in-memory-call-analysis.repository";
import { FakeTransferAnalysisAgentPort } from "../../fakes/fake-transfer-analysis-agent.port";
import { TriggerTransferAnalysisUseCase } from "@/domain/integrations/transfer-analysis/application/use-cases/trigger-transfer-analysis.use-case";
import { GatekeeperAnalysis } from "@/domain/integrations/gatekeeper-analysis/enterprise/entities/gatekeeper-analysis.entity";
import { CallAnalysis } from "@/domain/integrations/call-analysis/enterprise/entities/call-analysis.entity";
import type { ActivityAnalysisContext } from "@/domain/activities/application/repositories/activities.repository";

const input = () => ({
  activityId: "act-1",
  ownerId: "user-1",
  gkWebhookUrl: "https://api.crm.wbdigitalsolutions.com/webhooks/gatekeeper-analysis",
  spicedWebhookUrl: "https://api.crm.wbdigitalsolutions.com/webhooks/call-analysis",
});

// Minimal fake exposing only the method the use case calls.
class FakeActivities {
  ctx: ActivityAnalysisContext | null = {
    subject: "Ligação transferência",
    gotoTranscriptText: "SDR: Bom dia... GK: Um momento... Decisor: Alô, Carlos aqui.",
    gotoDuration: 240,
    dueDate: new Date("2026-05-01T10:00:00Z"),
    lead: { id: "lead-1", businessName: "Empresa X LTDA", segment: "Varejo", city: "São Paulo" },
    contact: { name: "Maria (GK)", role: "Recepcionista" },
  };
  async findAnalysisContext() { return this.ctx; }
}

describe("TriggerTransferAnalysisUseCase", () => {
  let gkRepo: InMemoryGatekeeperAnalysisRepository;
  let callRepo: InMemoryCallAnalysisRepository;
  let agentPort: FakeTransferAnalysisAgentPort;
  let activities: FakeActivities;
  let sut: TriggerTransferAnalysisUseCase;

  beforeEach(() => {
    gkRepo = new InMemoryGatekeeperAnalysisRepository();
    callRepo = new InMemoryCallAnalysisRepository();
    agentPort = new FakeTransferAnalysisAgentPort();
    activities = new FakeActivities();
    sut = new TriggerTransferAnalysisUseCase(gkRepo, callRepo, agentPort, activities as never);
  });

  it("returns left when the activity does not exist", async () => {
    activities.ctx = null;
    const result = await sut.execute(input());
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("não encontrada");
    expect(agentPort.calls).toHaveLength(0);
  });

  it("returns left when the activity has no transcript", async () => {
    activities.ctx = { ...activities.ctx!, gotoTranscriptText: null };
    const result = await sut.execute(input());
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("transcrição");
    expect(agentPort.calls).toHaveLength(0);
  });

  it("creates both pending analyses and calls agent with both jobIds", async () => {
    const result = await sut.execute(input());

    expect(result.isRight()).toBe(true);
    expect(gkRepo.items).toHaveLength(1);
    expect(callRepo.items).toHaveLength(1);
    expect(gkRepo.items[0].status).toBe("pending");
    expect(callRepo.items[0].status).toBe("pending");
    expect(gkRepo.items[0].activityId).toBe("act-1");
    expect(callRepo.items[0].activityId).toBe("act-1");

    expect(agentPort.calls).toHaveLength(1);
    const call = agentPort.calls[0];
    expect(call.gkJobId).toBe(gkRepo.items[0].jobId);
    expect(call.spicedJobId).toBe(callRepo.items[0].jobId);
    expect(call.gkWebhookUrl).toContain("gatekeeper-analysis");
    expect(call.spicedWebhookUrl).toContain("call-analysis");
  });

  it("returns both analysisIds on success", async () => {
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.gkAnalysisId).toBe(gkRepo.items[0].id.toString());
      expect(result.value.spicedAnalysisId).toBe(callRepo.items[0].id.toString());
    }
  });

  it("passes transcript and lead/contact data from the activity context to the agent", async () => {
    await sut.execute(input());
    const call = agentPort.calls[0];
    expect(call.transcript).toContain("Carlos aqui");
    expect(call.lead.businessName).toBe("Empresa X LTDA");
    expect(call.contact?.name).toBe("Maria (GK)");
    expect(call.callDate).toBe(new Date("2026-05-01T10:00:00Z").toISOString());
  });

  it("reuses existing pending GK analysis — does not duplicate", async () => {
    await gkRepo.save(GatekeeperAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "pending", jobId: "gk-job-old" }));
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    expect(gkRepo.items).toHaveLength(1);
  });

  it("reuses existing pending SPICED analysis — does not duplicate", async () => {
    await callRepo.save(CallAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "pending", jobId: "spiced-job-old" }));
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    expect(callRepo.items).toHaveLength(1);
  });

  it("does not call agent if both analyses are already pending/completed", async () => {
    await gkRepo.save(GatekeeperAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "pending", jobId: "gk-old" }));
    await callRepo.save(CallAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "pending", jobId: "spiced-old" }));
    await sut.execute(input());
    expect(agentPort.calls).toHaveLength(0);
  });

  it("re-triggers if GK analysis was error", async () => {
    await gkRepo.save(GatekeeperAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "error", jobId: "gk-fail" }));
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    expect(agentPort.calls).toHaveLength(1);
  });

  it("re-triggers if SPICED analysis was error", async () => {
    await gkRepo.save(GatekeeperAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "completed", jobId: "gk-ok" }));
    await callRepo.save(CallAnalysis.create({ activityId: "act-1", ownerId: "user-1", status: "error", jobId: "spiced-fail" }));
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    expect(agentPort.calls).toHaveLength(1);
  });
});
