import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMeetAnalysisRepository } from "../../fakes/in-memory-meet-analysis.repository";
import { FakeMeetAnalysisAgentPort } from "../../fakes/fake-meet-analysis-agent.port";
import { TriggerMeetAnalysisUseCase } from "@/domain/integrations/meet-analysis/application/use-cases/trigger-meet-analysis.use-case";
import { MeetAnalysis } from "@/domain/integrations/meet-analysis/enterprise/entities/meet-analysis.entity";
import type { MeetAnalysisContext } from "@/domain/integrations/meet/application/repositories/meetings.repository";

const input = () => ({
  activityId: "activity-1",
  ownerId: "user-1",
  webhookUrl: "https://crm.wbdigitalsolutions.com/webhooks/meet-analysis",
});

class FakeMeetings {
  ctx: MeetAnalysisContext | null = {
    title: "Diagnóstico - Empresa X",
    transcriptText: "Bom dia, obrigado por participar...",
    durationSeconds: 3600,
    meetingDate: new Date("2026-04-30T14:00:00Z"),
    lead: { id: "lead-1", businessName: "Empresa X LTDA", description: "Distribuidora regional", segment: "Varejo", city: "São Paulo" },
    contact: { name: "João Silva", role: "CEO" },
  };
  async findMeetAnalysisContext() { return this.ctx; }
}

describe("TriggerMeetAnalysisUseCase", () => {
  let repo: InMemoryMeetAnalysisRepository;
  let agentPort: FakeMeetAnalysisAgentPort;
  let meetings: FakeMeetings;
  let sut: TriggerMeetAnalysisUseCase;

  beforeEach(() => {
    repo = new InMemoryMeetAnalysisRepository();
    agentPort = new FakeMeetAnalysisAgentPort();
    meetings = new FakeMeetings();
    sut = new TriggerMeetAnalysisUseCase(repo, agentPort, meetings as never);
  });

  it("returns left when the meeting is not found for the activity", async () => {
    meetings.ctx = null;
    const result = await sut.execute(input());
    expect(result.isLeft()).toBe(true);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("returns left when the meeting has no transcript", async () => {
    meetings.ctx = { ...meetings.ctx!, transcriptText: null };
    const result = await sut.execute(input());
    expect(result.isLeft()).toBe(true);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("creates analysis with pending status and calls agent with context data", async () => {
    const result = await sut.execute(input());

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
    expect(call.transcript).toBe("Bom dia, obrigado por participar...");
    expect(call.lead.businessName).toBe("Empresa X LTDA");
    expect(call.lead.description).toBe("Distribuidora regional");
    expect(call.contact?.name).toBe("João Silva");
    expect(call.meetingTitle).toBe("Diagnóstico - Empresa X");
    expect(call.activity.subject).toBe("Diagnóstico - Empresa X");
    expect(call.meetingDurationSeconds).toBe(3600);
    expect(call.meetingDate).toBe(new Date("2026-04-30T14:00:00Z").toISOString());
  });

  it("does not duplicate if analysis already pending", async () => {
    await repo.save(MeetAnalysis.create({ activityId: "activity-1", ownerId: "user-1", status: "pending", jobId: "existing-job-id" }));
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("does not duplicate if analysis already completed", async () => {
    await repo.save(MeetAnalysis.create({ activityId: "activity-1", ownerId: "user-1", status: "completed", jobId: "completed-job-id", score: 4 }));
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("re-triggers analysis if previous attempt errored", async () => {
    await repo.save(MeetAnalysis.create({ activityId: "activity-1", ownerId: "user-1", status: "error", jobId: "failed-job-id", errorMsg: "Timeout" }));
    const result = await sut.execute(input());
    expect(result.isRight()).toBe(true);
    expect(agentPort.calls).toHaveLength(1);
  });
});
