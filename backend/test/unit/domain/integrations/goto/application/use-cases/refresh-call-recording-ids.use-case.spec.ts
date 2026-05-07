import { describe, it, expect, beforeEach } from "vitest";
import { RefreshCallRecordingIdsUseCase } from "@/domain/integrations/goto/application/use-cases/refresh-call-recording-ids.use-case";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakeGoToApiPort } from "../../fakes/fake-goto-api.port";
import { FakeGoToTokenPort } from "../../fakes/fake-goto-token.port";
import { Activity } from "@/domain/activities/enterprise/entities/activity";
import { UniqueEntityID } from "@/core/unique-entity-id";

function makeAnsweredCall(overrides: Partial<Parameters<typeof Activity.create>[0]> = {}): Activity {
  return Activity.create(
    {
      ownerId: "owner-1",
      type: "call",
      subject: "Ligação realizada — +5511999999999 (5min)",
      completed: true,
      completedAt: new Date(),
      gotoDuration: 300,
      gotoCallId: "call-id-1",
      gotoCallOutcome: "answered",
      ...overrides,
    },
    new UniqueEntityID(),
  );
}

describe("RefreshCallRecordingIdsUseCase", () => {
  let repo: FakeActivitiesRepository;
  let goToApi: FakeGoToApiPort;
  let goToToken: FakeGoToTokenPort;
  let sut: RefreshCallRecordingIdsUseCase;

  beforeEach(() => {
    repo = new FakeActivitiesRepository();
    goToApi = new FakeGoToApiPort();
    goToToken = new FakeGoToTokenPort();
    sut = new RefreshCallRecordingIdsUseCase(repo, goToApi, goToToken);
  });

  it("preenche gotoRecordingId quando GoTo retorna gravação", async () => {
    const activity = makeAnsweredCall({ gotoCallId: "call-abc" });
    repo.items.push(activity);

    goToApi.addReport({
      conversationSpaceId: "call-abc",
      accountKey: "",
      direction: "OUTBOUND",
      callCreated: new Date().toISOString(),
      callEnded: new Date().toISOString(),
      participants: [
        {
          id: "p1",
          legId: "leg1",
          type: { value: "PHONE_NUMBER", number: "+5511999999999" },
          recordings: [{ id: "rec-xyz", startTimestamp: new Date().toISOString(), transcriptEnabled: false }],
        },
      ],
    });

    const result = await sut.execute({ sinceDaysAgo: 2 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.refreshed).toBe(1);
      expect(result.value.skipped).toBe(0);
    }

    const updated = repo.items.find((a) => a.id.equals(activity.id));
    expect(updated?.gotoRecordingId).toBe("rec-xyz");
  });

  it("não atualiza quando GoTo ainda não tem gravação", async () => {
    const activity = makeAnsweredCall({ gotoCallId: "call-no-rec" });
    repo.items.push(activity);

    goToApi.addReport({
      conversationSpaceId: "call-no-rec",
      accountKey: "",
      direction: "OUTBOUND",
      callCreated: new Date().toISOString(),
      callEnded: new Date().toISOString(),
      participants: [
        {
          id: "p1",
          legId: "leg1",
          type: { value: "PHONE_NUMBER", number: "+5511999999999" },
          recordings: [],
        },
      ],
    });

    const result = await sut.execute({ sinceDaysAgo: 2 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.refreshed).toBe(0);
      expect(result.value.skipped).toBe(1);
    }

    const notUpdated = repo.items.find((a) => a.id.equals(activity.id));
    expect(notUpdated?.gotoRecordingId).toBeUndefined();
  });

  it("ignora atividade que já tem gotoRecordingId", async () => {
    const activity = makeAnsweredCall({ gotoCallId: "call-has-rec", gotoRecordingId: "already-set" });
    repo.items.push(activity);

    const result = await sut.execute({ sinceDaysAgo: 2 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.refreshed).toBe(0);
    }
    expect(goToApi.fetchCallReportCalls).toHaveLength(0);
  });

  it("ignora atividades sem gotoCallId", async () => {
    const activity = makeAnsweredCall({ gotoCallId: undefined });
    repo.items.push(activity);

    const result = await sut.execute({ sinceDaysAgo: 2 });

    expect(result.isRight()).toBe(true);
    expect(goToApi.fetchCallReportCalls).toHaveLength(0);
  });

  it("ignora chamadas curtas (voicemail / não atendeu)", async () => {
    const activity = makeAnsweredCall({ gotoCallId: "call-short", gotoDuration: 10 });
    repo.items.push(activity);

    const result = await sut.execute({ sinceDaysAgo: 2 });

    expect(result.isRight()).toBe(true);
    expect(goToApi.fetchCallReportCalls).toHaveLength(0);
  });

  it("retorna right com refreshed=0 quando não há atividades pendentes", async () => {
    const result = await sut.execute({ sinceDaysAgo: 2 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.refreshed).toBe(0);
      expect(result.value.skipped).toBe(0);
    }
  });

  it("continua processando demais atividades mesmo se GoTo falhar para uma", async () => {
    const a1 = makeAnsweredCall({ gotoCallId: "call-fail" });
    const a2 = makeAnsweredCall({ gotoCallId: "call-ok" });
    a2.id; // ensure different IDs via UniqueEntityID
    repo.items.push(a1, a2);

    // only a2 has a report; a1 will get null (API not found)
    goToApi.addReport({
      conversationSpaceId: "call-ok",
      accountKey: "",
      direction: "OUTBOUND",
      callCreated: new Date().toISOString(),
      callEnded: new Date().toISOString(),
      participants: [
        {
          id: "p1",
          legId: "leg1",
          type: { value: "PHONE_NUMBER", number: "+5511999999999" },
          recordings: [{ id: "rec-ok", startTimestamp: new Date().toISOString(), transcriptEnabled: false }],
        },
      ],
    });

    const result = await sut.execute({ sinceDaysAgo: 2 });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.refreshed).toBe(1);
    }

    const updated = repo.items.find((a) => a.gotoRecordingId === "rec-ok");
    expect(updated).toBeDefined();
  });

  it("usa o token correto ao chamar a API GoTo", async () => {
    goToToken.token = "my-token-123";
    const activity = makeAnsweredCall({ gotoCallId: "call-token-check" });
    repo.items.push(activity);

    goToApi.addReport({
      conversationSpaceId: "call-token-check",
      accountKey: "",
      direction: "OUTBOUND",
      callCreated: new Date().toISOString(),
      callEnded: new Date().toISOString(),
      participants: [
        {
          id: "p1",
          legId: "leg1",
          type: { value: "PHONE_NUMBER" },
          recordings: [{ id: "rec-1", startTimestamp: new Date().toISOString(), transcriptEnabled: false }],
        },
      ],
    });

    await sut.execute({ sinceDaysAgo: 2 });

    expect(goToApi.fetchCallReportCalls[0].accessToken).toBe("my-token-123");
  });
});
