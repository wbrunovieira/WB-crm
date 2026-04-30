import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMeetAnalysisRepository } from "../../fakes/in-memory-meet-analysis.repository";
import { FakeMeetAnalysisAgentPort } from "../../fakes/fake-meet-analysis-agent.port";
import { TriggerMeetAnalysisUseCase } from "@/domain/integrations/meet-analysis/application/use-cases/trigger-meet-analysis.use-case";
import { MeetAnalysis } from "@/domain/integrations/meet-analysis/enterprise/entities/meet-analysis.entity";

const makeInput = (
  overrides: Partial<Parameters<TriggerMeetAnalysisUseCase["execute"]>[0]> = {},
) => ({
  activityId: "activity-1",
  activitySubject: "Reunião diagnóstico",
  activityNotes: "Reunião de diagnóstico comercial",
  transcript: "Bom dia, obrigado por participar...",
  meetingDurationSeconds: 3600,
  meetingDate: new Date("2026-04-30T14:00:00Z"),
  meetingTitle: "Diagnóstico - Empresa X",
  leadId: "lead-1",
  leadBusinessName: "Empresa X LTDA",
  leadDescription: "Distribuidora regional",
  leadSegment: "Varejo",
  leadCity: "São Paulo",
  contactName: "João Silva",
  contactRole: "CEO",
  ownerId: "user-1",
  webhookUrl: "https://crm.wbdigitalsolutions.com/webhooks/meet-analysis",
  ...overrides,
});

describe("TriggerMeetAnalysisUseCase", () => {
  let repo: InMemoryMeetAnalysisRepository;
  let agentPort: FakeMeetAnalysisAgentPort;
  let sut: TriggerMeetAnalysisUseCase;

  beforeEach(() => {
    repo = new InMemoryMeetAnalysisRepository();
    agentPort = new FakeMeetAnalysisAgentPort();
    sut = new TriggerMeetAnalysisUseCase(repo, agentPort);
  });

  it("creates analysis with pending status and calls agent", async () => {
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
    expect(call.transcript).toBe("Bom dia, obrigado por participar...");
    expect(call.lead.businessName).toBe("Empresa X LTDA");
    expect(call.contact?.name).toBe("João Silva");
    expect(call.activity.subject).toBe("Reunião diagnóstico");
    expect(call.webhookUrl).toBe("https://crm.wbdigitalsolutions.com/webhooks/meet-analysis");
  });

  it("does not duplicate if analysis already pending", async () => {
    const existing = MeetAnalysis.create({
      activityId: "activity-1",
      ownerId: "user-1",
      status: "pending",
      jobId: "existing-job-id",
    });
    await repo.save(existing);

    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.analysisId).toBe(existing.id.toString());
    }
    expect(repo.items).toHaveLength(1);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("does not duplicate if analysis already completed", async () => {
    const existing = MeetAnalysis.create({
      activityId: "activity-1",
      ownerId: "user-1",
      status: "completed",
      jobId: "completed-job-id",
      score: 4,
    });
    await repo.save(existing);

    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);
    expect(agentPort.calls).toHaveLength(0);
  });

  it("re-triggers analysis if previous attempt errored", async () => {
    const existing = MeetAnalysis.create({
      activityId: "activity-1",
      ownerId: "user-1",
      status: "error",
      jobId: "failed-job-id",
      errorMsg: "Timeout",
    });
    await repo.save(existing);

    const result = await sut.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(agentPort.calls).toHaveLength(1);
  });

  it("passes meetingDate as ISO string to agent", async () => {
    const date = new Date("2026-04-30T14:00:00Z");
    await sut.execute(makeInput({ meetingDate: date }));

    expect(agentPort.calls[0].meetingDate).toBe(date.toISOString());
  });

  it("passes meetingDurationSeconds to agent", async () => {
    await sut.execute(makeInput({ meetingDurationSeconds: 5400 }));
    expect(agentPort.calls[0].meetingDurationSeconds).toBe(5400);
  });

  it("passes meetingTitle to agent", async () => {
    await sut.execute(makeInput({ meetingTitle: "Reunião DIAG - Cliente Y" }));
    expect(agentPort.calls[0].meetingTitle).toBe("Reunião DIAG - Cliente Y");
  });
});
