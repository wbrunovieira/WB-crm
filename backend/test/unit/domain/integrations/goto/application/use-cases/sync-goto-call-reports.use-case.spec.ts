import { describe, it, expect, beforeEach, vi } from "vitest";
import { SyncGotoCallReportsUseCase } from "@/domain/integrations/goto/application/use-cases/sync-goto-call-reports.use-case";
import { CreateCallActivityUseCase } from "@/domain/integrations/goto/application/use-cases/create-call-activity.use-case";
import { FakeGoToApiPort } from "../../fakes/fake-goto-api.port";
import { FakeGoToTokenPort } from "../../fakes/fake-goto-token.port";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakePhoneMatcherService } from "../../fakes/fake-phone-matcher.service";
import type { GoToCallHistoryItem } from "@/domain/integrations/goto/application/ports/goto-api.port";

function makeHistoryItem(
  originatorId: string,
  overrides: Partial<GoToCallHistoryItem> = {},
): GoToCallHistoryItem {
  return {
    originatorId,
    legId: `leg-${originatorId}`,
    direction: "OUTBOUND",
    startTime: "2024-01-01T10:00:00Z",
    answerTime: "2024-01-01T10:00:10Z",
    duration: 60_000, // 60s
    hangupCause: 16,
    caller: { number: "+5511900000001" },
    callee: { number: "+5511999998888" },
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

// ─── Comportamentos gerais ─────────────────────────────────────────────────────

describe("SyncGotoCallReportsUseCase", () => {
  it("retorna zeros quando não há itens no call-history", async () => {
    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ fetched: 0, created: 0, skipped: 0 });
  });

  it("cria atividades para todos os itens novos", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("call-001"), makeHistoryItem("call-002")];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ fetched: 2, created: 2, skipped: 0 });
    expect(activitiesRepo.items).toHaveLength(2);
  });

  it("pula itens já existentes (idempotência)", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("call-dupe")];

    await useCase.execute({ ownerId: "owner-001" });
    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ fetched: 1, created: 0, skipped: 1 });
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("garante criado + pulado = buscado (invariante de contagem)", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("call-aaa"), makeHistoryItem("call-bbb")];
    await useCase.execute({ ownerId: "owner-001" }); // cria os dois

    goToApi.callHistoryItems = [
      makeHistoryItem("call-aaa"), // já existe → skipped
      makeHistoryItem("call-novo"),  // novo → created
    ];
    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.value.fetched).toBe(2);
    expect(result.value.created + result.value.skipped).toBe(2);
    expect(result.value.created).toBe(1);
    expect(result.value.skipped).toBe(1);
  });

  it("usa o access token válido do token port", async () => {
    goToToken.token = "expected-token";
    goToApi.callHistoryItems = [makeHistoryItem("call-001")];

    await useCase.execute({ ownerId: "owner-001" });

    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("propaga erros do token port", async () => {
    goToToken.shouldFail = true;

    await expect(useCase.execute({ ownerId: "owner-001" })).rejects.toThrow("Token unavailable");
  });

  it("emite goto.activity.created para cada atividade nova", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("call-001"), makeHistoryItem("call-002")];

    await useCase.execute({ ownerId: "owner-001" });

    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "goto.activity.created",
      expect.objectContaining({ activityId: expect.any(String) }),
    );
  });

  it("não emite evento para atividades já existentes (puladas)", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("call-dupe")];
    await useCase.execute({ ownerId: "owner-001" });
    eventEmitter.emit.mockClear();

    await useCase.execute({ ownerId: "owner-001" });

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});

// ─── Comportamentos específicos do call-history ────────────────────────────────

describe("SyncGotoCallReportsUseCase — call-history source", () => {
  beforeEach(() => {
    goToApi = new FakeGoToApiPort();
    goToToken = new FakeGoToTokenPort();
    activitiesRepo = new FakeActivitiesRepository();
    phoneMatcher = new FakePhoneMatcherService();
    createActivity = new CreateCallActivityUseCase(activitiesRepo, phoneMatcher as never);
    eventEmitter = { emit: vi.fn() };
    useCase = new SyncGotoCallReportsUseCase(goToApi, goToToken, createActivity, eventEmitter as never);
  });

  it("cria atividade para chamada OUTBOUND atendida via call-history", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("ch-001")];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.value).toMatchObject({ fetched: 1, created: 1, skipped: 0 });
    expect(activitiesRepo.items[0].gotoCallId).toBe("ch-001");
    expect(activitiesRepo.items[0].gotoCallOutcome).toBe("answered");
  });

  it("cria atividade para chamada OUTBOUND não atendida (hangupCause 18 → no_answer)", async () => {
    goToApi.callHistoryItems = [
      makeHistoryItem("ch-002", { answerTime: undefined, duration: 0, hangupCause: 18 }),
    ];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.value).toMatchObject({ created: 1 });
    expect(activitiesRepo.items[0].gotoCallOutcome).toBe("no_answer");
  });

  it("cria atividade para chamada OUTBOUND ocupado (hangupCause 17 → busy)", async () => {
    goToApi.callHistoryItems = [
      makeHistoryItem("ch-003", { answerTime: undefined, duration: 0, hangupCause: 17 }),
    ];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(activitiesRepo.items[0].gotoCallOutcome).toBe("busy");
  });

  it("cria atividade para caixa postal (answerTime presente + duração < 15s)", async () => {
    goToApi.callHistoryItems = [
      makeHistoryItem("ch-004", { answerTime: "2024-01-01T10:00:10Z", duration: 10_000 }),
    ];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(activitiesRepo.items[0].gotoCallOutcome).toBe("voicemail");
  });

  it("deduplica legs do mesmo originatorId — cria apenas uma atividade, fetched = total de legs", async () => {
    goToApi.callHistoryItems = [
      makeHistoryItem("ch-005", { direction: "OUTBOUND", legId: "leg-a" }),
      makeHistoryItem("ch-005", { direction: "INBOUND", legId: "leg-b" }),
    ];

    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.value).toMatchObject({ fetched: 2, created: 1, skipped: 0 });
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("prefere leg OUTBOUND ao deduplicar por originatorId", async () => {
    goToApi.callHistoryItems = [
      makeHistoryItem("ch-006", { direction: "INBOUND", legId: "leg-inbound", answerTime: undefined, duration: 0 }),
      makeHistoryItem("ch-006", { direction: "OUTBOUND", legId: "leg-outbound", answerTime: "2024-01-01T10:00:10Z", duration: 60_000 }),
    ];

    await useCase.execute({ ownerId: "owner-001" });

    expect(activitiesRepo.items[0].gotoCallOutcome).toBe("answered");
  });

  it("idempotência: segundo sync não cria duplicata", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("ch-007")];

    await useCase.execute({ ownerId: "owner-001" });
    const result = await useCase.execute({ ownerId: "owner-001" });

    expect(result.value).toMatchObject({ fetched: 1, created: 0, skipped: 1 });
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("emite evento goto.activity.created para cada nova atividade", async () => {
    goToApi.callHistoryItems = [makeHistoryItem("ch-008"), makeHistoryItem("ch-009")];

    await useCase.execute({ ownerId: "owner-001" });

    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
  });
});
