import { describe, it, expect, beforeEach, vi } from "vitest";
import { right } from "@/core/either";
import { InMemoryActivitiesRepository } from "../../repositories/in-memory-activities.repository";
import { UpdateActivityUseCase } from "@/domain/activities/application/use-cases/update-activity.use-case";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import type { TriggerCallAnalysisUseCase } from "@/domain/integrations/call-analysis/application/use-cases/trigger-call-analysis.use-case";

function makeActivity(overrides: Partial<Parameters<typeof Activity.create>[0]> = {}) {
  return Activity.create({
    ownerId: "user-1",
    type: "call",
    subject: "Ligação teste",
    completed: false,
    meetingNoShow: false,
    emailReplied: false,
    emailOpenCount: 0,
    emailLinkClickCount: 0,
    leadId: "lead-1",
    gotoTranscriptText: '[{"start":0,"end":5,"text":" Olá!","speaker":"agent","speakerName":"Bruno"}]',
    gotoDuration: 144,
    ...overrides,
  });
}

describe("UpdateActivityUseCase — call analysis trigger", () => {
  let repo: InMemoryActivitiesRepository;
  let triggerSpy: ReturnType<typeof vi.fn>;
  let fakeTrigger: TriggerCallAnalysisUseCase;
  let sut: UpdateActivityUseCase;

  beforeEach(() => {
    repo = new InMemoryActivitiesRepository();
    triggerSpy = vi.fn().mockResolvedValue(right({ analysisId: "analysis-1" }));
    fakeTrigger = { execute: triggerSpy } as unknown as TriggerCallAnalysisUseCase;
    sut = new UpdateActivityUseCase(repo, fakeTrigger);
  });

  it("triggers call analysis when callContactType changes to decisor and transcript exists", async () => {
    const activity = makeActivity();
    await repo.save(activity);

    await sut.execute({
      id: activity.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      callContactType: "decisor",
    });

    // setImmediate fires after the promise resolves
    await new Promise((r) => setImmediate(r));

    expect(triggerSpy).toHaveBeenCalledOnce();
  });

  it("passes gotoDuration as callDurationSeconds to the trigger", async () => {
    const activity = makeActivity({ gotoDuration: 270 });
    await repo.save(activity);

    await sut.execute({
      id: activity.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      callContactType: "decisor",
    });

    await new Promise((r) => setImmediate(r));

    expect(triggerSpy).toHaveBeenCalledOnce();
    const input = triggerSpy.mock.calls[0][0];
    expect(input.callDurationSeconds).toBe(270);
  });

  it("passes zero callDurationSeconds when gotoDuration is absent", async () => {
    const activity = makeActivity({ gotoDuration: undefined });
    await repo.save(activity);

    await sut.execute({
      id: activity.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      callContactType: "decisor",
    });

    await new Promise((r) => setImmediate(r));

    const input = triggerSpy.mock.calls[0][0];
    expect(input.callDurationSeconds).toBe(0);
  });

  it("does NOT trigger analysis when callContactType is not decisor", async () => {
    const activity = makeActivity();
    await repo.save(activity);

    await sut.execute({
      id: activity.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      callContactType: "nao_decisor",
    });

    await new Promise((r) => setImmediate(r));

    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it("does NOT trigger analysis when transcript is absent", async () => {
    const activity = makeActivity({ gotoTranscriptText: undefined });
    await repo.save(activity);

    await sut.execute({
      id: activity.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      callContactType: "decisor",
    });

    await new Promise((r) => setImmediate(r));

    expect(triggerSpy).not.toHaveBeenCalled();
  });
});
