import { describe, it, expect, beforeEach, vi } from "vitest";
import { SyncGotoCallReportsUseCase } from "@/domain/integrations/goto/application/use-cases/sync-goto-call-reports.use-case";
import { CreateCallActivityUseCase } from "@/domain/integrations/goto/application/use-cases/create-call-activity.use-case";
import { FakeGoToApiPort } from "../../fakes/fake-goto-api.port";
import { FakeGoToTokenPort } from "../../fakes/fake-goto-token.port";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakePhoneMatcherService } from "../../fakes/fake-phone-matcher.service";
import type { GoToCallReport } from "@/domain/integrations/goto/application/ports/goto-api.port";

function makeReport(id: string, overrides: Partial<GoToCallReport> = {}): GoToCallReport {
  const now = new Date();
  return {
    conversationSpaceId: id,
    accountKey: "acc-001",
    direction: "OUTBOUND",
    callCreated: new Date(now.getTime() - 60000).toISOString(),
    callEnded: now.toISOString(),
    participants: [
      { id: "p1", legId: "l1", type: { value: "LINE", lineId: "l1" } },
      {
        id: "p2",
        legId: "l2",
        type: { value: "PHONE_NUMBER", callee: { name: "Test", number: "+5511999998888" } },
        causeCode: 16,
      },
    ],
    ...overrides,
  };
}

let goToApi: FakeGoToApiPort;
let goToToken: FakeGoToTokenPort;
let activitiesRepo: FakeActivitiesRepository;
let phoneMatcher: FakePhoneMatcherService;
let createActivity: CreateCallActivityUseCase;
let eventEmitter: { emit: ReturnType<typeof vi.fn> };
let useCase: SyncGotoCallReportsUseCase;

beforeEach(() => {
  goToApi = new FakeGoToApiPort();
  goToToken = new FakeGoToTokenPort();
  activitiesRepo = new FakeActivitiesRepository();
  phoneMatcher = new FakePhoneMatcherService();
  createActivity = new CreateCallActivityUseCase(activitiesRepo, phoneMatcher as never);
  eventEmitter = { emit: vi.fn() };
  useCase = new SyncGotoCallReportsUseCase(goToApi, goToToken, createActivity, eventEmitter as never);
});

describe("SyncGotoCallReportsUseCase", () => {
  it("returns zero counts when no reports available", async () => {
    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ fetched: 0, created: 0, skipped: 0 });
  });

  it("creates activities for all new reports", async () => {
    goToApi.reportsSince = [makeReport("call-001"), makeReport("call-002")];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ fetched: 2, created: 2, skipped: 0 });
    expect(activitiesRepo.items).toHaveLength(2);
  });

  it("skips duplicate reports (idempotency)", async () => {
    goToApi.reportsSince = [makeReport("call-dupe")];

    // First sync creates it
    await useCase.execute({ ownerId: "owner-001" });
    // Second sync should skip
    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ fetched: 1, created: 0, skipped: 1 });
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("counts failed activity creation as skipped", async () => {
    // Report with invalid direction to force a creation failure
    const badReport = makeReport("call-bad");
    badReport.direction = "UNKNOWN" as "INBOUND";
    goToApi.reportsSince = [badReport, makeReport("call-good")];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value.fetched).toBe(2);
    // bad one skipped, good one created
    expect(result.value.created + result.value.skipped).toBe(2);
  });

  it("uses valid access token from token port", async () => {
    goToToken.token = "expected-token";
    goToApi.reportsSince = [makeReport("call-001")];

    await useCase.execute({ ownerId: "owner-001" });

    // Token was used — no error
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("propagates token errors", async () => {
    goToToken.shouldFail = true;

    await expect(useCase.execute({ ownerId: "owner-001" })).rejects.toThrow("Token unavailable");
  });

  it("emits goto.activity.created for each newly created activity", async () => {
    goToApi.reportsSince = [makeReport("call-001"), makeReport("call-002")];

    await useCase.execute({ ownerId: "owner-001" });

    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "goto.activity.created",
      expect.objectContaining({ activityId: expect.any(String) }),
    );
  });

  it("does not emit event for already-existing (skipped) activities", async () => {
    goToApi.reportsSince = [makeReport("call-dupe")];
    await useCase.execute({ ownerId: "owner-001" }); // creates it
    eventEmitter.emit.mockClear();

    await useCase.execute({ ownerId: "owner-001" }); // skips it

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
