import { describe, it, expect, beforeEach } from "vitest";
import { HandleGotoWebhookUseCase } from "@/domain/integrations/goto/application/use-cases/handle-goto-webhook.use-case";
import { CreateCallActivityUseCase } from "@/domain/integrations/goto/application/use-cases/create-call-activity.use-case";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakeGoToApiPort } from "../../fakes/fake-goto-api.port";
import { FakeGoToTokenPort } from "../../fakes/fake-goto-token.port";
import { FakePhoneMatcherService } from "../../fakes/fake-phone-matcher.service";
import { GoToCallReport } from "@/domain/integrations/goto/application/ports/goto-api.port";

const OWNER_ID = "owner-001";

const makeReport = (overrides: Partial<GoToCallReport> = {}): GoToCallReport => ({
  conversationSpaceId: "call-space-123",
  accountKey: "acc-key",
  direction: "OUTBOUND",
  callCreated: new Date(Date.now() - 60000).toISOString(),
  callEnded: new Date().toISOString(),
  participants: [
    {
      id: "part-1",
      legId: "leg-1",
      type: { value: "LINE", lineId: "line-1" },
    },
    {
      id: "part-2",
      legId: "leg-2",
      type: { value: "PHONE_NUMBER", callee: { name: "Test", number: "+5511999998888" } },
      causeCode: 16,
    },
  ],
  ...overrides,
});

let repo: FakeActivitiesRepository;
let goToApi: FakeGoToApiPort;
let goToToken: FakeGoToTokenPort;
let phoneMatcher: FakePhoneMatcherService;
let createCallActivity: CreateCallActivityUseCase;
let useCase: HandleGotoWebhookUseCase;

beforeEach(() => {
  repo = new FakeActivitiesRepository();
  goToApi = new FakeGoToApiPort();
  goToToken = new FakeGoToTokenPort();
  phoneMatcher = new FakePhoneMatcherService();
  createCallActivity = new CreateCallActivityUseCase(repo, phoneMatcher as never);
  useCase = new HandleGotoWebhookUseCase(goToApi, goToToken, createCallActivity);
});

describe("HandleGotoWebhookUseCase", () => {
  it("ignores non-REPORT_SUMMARY events (STARTING)", async () => {
    const result = await useCase.execute({
      eventType: "STARTING",
      conversationSpaceId: "call-space-123",
      rawPayload: {},
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
    expect(repo.items).toHaveLength(0);
  });

  it("ignores non-REPORT_SUMMARY events (ACTIVE)", async () => {
    const result = await useCase.execute({
      eventType: "ACTIVE",
      conversationSpaceId: "call-space-123",
      rawPayload: {},
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
  });

  it("ignores non-REPORT_SUMMARY events (ENDING)", async () => {
    const result = await useCase.execute({
      eventType: "ENDING",
      conversationSpaceId: "call-space-123",
      rawPayload: {},
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
  });

  it("creates activity for REPORT_SUMMARY event", async () => {
    const report = makeReport();
    goToApi.addReport(report);

    const result = await useCase.execute({
      eventType: "REPORT_SUMMARY",
      conversationSpaceId: "call-space-123",
      rawPayload: {},
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ activityId: expect.any(String) });
    expect(repo.items).toHaveLength(1);
    expect(goToApi.fetchCallReportCalls).toHaveLength(1);
    expect(goToApi.fetchCallReportCalls[0].conversationSpaceId).toBe("call-space-123");
  });

  it("returns ignored=true when fetch fails (never 500 on webhook)", async () => {
    goToApi.shouldFail = true;

    const result = await useCase.execute({
      eventType: "REPORT_SUMMARY",
      conversationSpaceId: "call-space-123",
      rawPayload: {},
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
    expect(repo.items).toHaveLength(0);
  });

  it("returns ignored=true when token service throws", async () => {
    goToToken.shouldFail = true;

    const result = await useCase.execute({
      eventType: "REPORT_SUMMARY",
      conversationSpaceId: "call-space-123",
      rawPayload: {},
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
  });

  it("returns ignored=true for REPORT_SUMMARY without conversationSpaceId", async () => {
    const result = await useCase.execute({
      eventType: "REPORT_SUMMARY",
      conversationSpaceId: undefined,
      rawPayload: {},
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
  });
});
