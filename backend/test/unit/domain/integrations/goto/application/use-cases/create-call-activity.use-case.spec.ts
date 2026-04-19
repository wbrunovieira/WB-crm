import { describe, it, expect, beforeEach } from "vitest";
import { CreateCallActivityUseCase } from "@/domain/integrations/goto/application/use-cases/create-call-activity.use-case";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakePhoneMatcherService } from "../../fakes/fake-phone-matcher.service";
import { GoToCallReport } from "@/domain/integrations/goto/application/ports/goto-api.port";

const OWNER_ID = "owner-001";
const CALL_ID = "call-space-abc";

function makeReport(overrides: Partial<GoToCallReport> = {}): GoToCallReport {
  const now = new Date();
  return {
    conversationSpaceId: CALL_ID,
    accountKey: "acc-key",
    direction: "OUTBOUND",
    callCreated: new Date(now.getTime() - 60000).toISOString(), // 60s ago
    callEnded: now.toISOString(),
    participants: [
      {
        id: "part-line",
        legId: "leg-line",
        type: { value: "LINE", lineId: "line-1" },
      },
      {
        id: "part-phone",
        legId: "leg-phone",
        type: { value: "PHONE_NUMBER", callee: { name: "Test Contact", number: "+5511999998888" } },
        causeCode: 16,
        recordings: [{ id: "rec-001", startTimestamp: now.toISOString(), transcriptEnabled: false }],
      },
    ],
    ...overrides,
  };
}

let repo: FakeActivitiesRepository;
let phoneMatcher: FakePhoneMatcherService;
let useCase: CreateCallActivityUseCase;

beforeEach(() => {
  repo = new FakeActivitiesRepository();
  phoneMatcher = new FakePhoneMatcherService();
  useCase = new CreateCallActivityUseCase(repo, phoneMatcher as never);
});

describe("CreateCallActivityUseCase", () => {
  it("creates activity for answered call", async () => {
    const report = makeReport();
    const result = await useCase.execute({ report, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ alreadyExists: false, activityId: expect.any(String) });
    expect(repo.items).toHaveLength(1);

    const activity = repo.items[0];
    expect(activity.type).toBe("call");
    expect(activity.gotoCallId).toBe(CALL_ID);
    expect(activity.gotoCallOutcome).toBe("answered");
    expect(activity.ownerId).toBe(OWNER_ID);
    expect(activity.completed).toBe(true);
  });

  it("detects voicemail when causeCode 16 and duration < 15s", async () => {
    const now = new Date();
    const report = makeReport({
      callCreated: new Date(now.getTime() - 10000).toISOString(), // 10s ago
      callEnded: now.toISOString(),
    });
    // causeCode 16, 10s → voicemail

    const result = await useCase.execute({ report, ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.gotoCallOutcome).toBe("voicemail");
  });

  it("returns alreadyExists=true for duplicate gotoCallId", async () => {
    const report = makeReport();
    await useCase.execute({ report, ownerId: OWNER_ID });

    // Execute again with same report
    const result = await useCase.execute({ report, ownerId: OWNER_ID });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ alreadyExists: true });
    // Should NOT create a second activity
    expect(repo.items).toHaveLength(1);
  });

  it("sets contactId when phone matches contact", async () => {
    phoneMatcher.addMatch("+5511999998888", {
      entityType: "contact",
      contactId: "contact-001",
    });

    const result = await useCase.execute({ report: makeReport(), ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.contactId).toBe("contact-001");
    expect(activity.leadId).toBeUndefined();
    expect(activity.partnerId).toBeUndefined();
  });

  it("sets leadId when phone matches lead", async () => {
    phoneMatcher.addMatch("+5511999998888", {
      entityType: "lead",
      leadId: "lead-001",
    });

    const result = await useCase.execute({ report: makeReport(), ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.leadId).toBe("lead-001");
    expect(activity.contactId).toBeUndefined();
  });

  it("sets recordingId only for answered calls", async () => {
    const now = new Date();
    const report = makeReport({
      callCreated: new Date(now.getTime() - 60000).toISOString(),
      callEnded: now.toISOString(),
    });
    // causeCode 16, 60s → answered, should have recording

    const result = await useCase.execute({ report, ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.gotoCallOutcome).toBe("answered");
    expect(activity.gotoRecordingId).toBe("rec-001");
  });

  it("no recordingId for voicemail", async () => {
    const now = new Date();
    const report = makeReport({
      callCreated: new Date(now.getTime() - 10000).toISOString(), // 10s → voicemail
      callEnded: now.toISOString(),
    });

    const result = await useCase.execute({ report, ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.gotoCallOutcome).toBe("voicemail");
    expect(activity.gotoRecordingId).toBeUndefined();
  });

  it("no recordingId for no_answer", async () => {
    const report = makeReport({
      participants: [
        {
          id: "part-line",
          legId: "leg-line",
          type: { value: "LINE", lineId: "line-1" },
        },
        {
          id: "part-phone",
          legId: "leg-phone",
          type: { value: "PHONE_NUMBER", number: "+5511999998888" },
          causeCode: 18, // no_answer
          recordings: [{ id: "rec-001", startTimestamp: new Date().toISOString(), transcriptEnabled: false }],
        },
      ],
    });

    const result = await useCase.execute({ report, ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.gotoCallOutcome).toBe("no_answer");
    expect(activity.gotoRecordingId).toBeUndefined();
  });

  it("no recordingId for busy", async () => {
    const report = makeReport({
      participants: [
        {
          id: "part-line",
          legId: "leg-line",
          type: { value: "LINE", lineId: "line-1" },
        },
        {
          id: "part-phone",
          legId: "leg-phone",
          type: { value: "PHONE_NUMBER", number: "+5511999998888" },
          causeCode: 17, // busy
        },
      ],
    });

    const result = await useCase.execute({ report, ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.gotoCallOutcome).toBe("busy");
    expect(activity.gotoRecordingId).toBeUndefined();
  });

  it("handles INBOUND missed call correctly", async () => {
    const now = new Date();
    const report = makeReport({
      direction: "INBOUND",
      callCreated: new Date(now.getTime() - 2000).toISOString(),
      callEnded: now.toISOString(), // ~2s
      participants: [
        {
          id: "part-line",
          legId: "leg-line",
          type: { value: "LINE", lineId: "line-1" },
        },
        {
          id: "part-phone",
          legId: "leg-phone",
          type: { value: "PHONE_NUMBER", number: "+5511999998888" },
        },
      ],
    });

    // Duration is not 0 for inbound with some time, but let's test inbound with 0s
    const report2 = makeReport({
      direction: "INBOUND",
      callCreated: now.toISOString(),
      callEnded: now.toISOString(),
      participants: [
        { id: "p1", legId: "l1", type: { value: "LINE", lineId: "line-1" } },
        { id: "p2", legId: "l2", type: { value: "PHONE_NUMBER", number: "+5511999998888" } },
      ],
    });

    const result = await useCase.execute({ report: report2, ownerId: OWNER_ID });
    expect(result.isRight()).toBe(true);

    const activity = repo.items[0];
    expect(activity.gotoCallOutcome).toBe("missed");
  });
});
