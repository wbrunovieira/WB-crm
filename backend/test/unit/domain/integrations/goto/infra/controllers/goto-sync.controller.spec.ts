import { describe, it, expect, beforeEach, vi } from "vitest";
import { GoToSyncController } from "@/domain/integrations/goto/infra/controllers/goto-sync.controller";
import { SyncGotoCallReportsUseCase } from "@/domain/integrations/goto/application/use-cases/sync-goto-call-reports.use-case";
import { right } from "@/core/either";

// ── Fake ─────────────────────────────────────────────────────────────────────

function makeFakeSync(output = { fetched: 3, created: 2, skipped: 1 }) {
  return {
    execute: vi.fn().mockResolvedValue(right(output)),
  } as unknown as SyncGotoCallReportsUseCase;
}

// ── Setup ─────────────────────────────────────────────────────────────────────

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env.GOTO_DEFAULT_OWNER_ID = "owner-test-001";
});

afterEach(() => {
  Object.assign(process.env, originalEnv);
  Object.keys(process.env).forEach((k) => {
    if (!(k in originalEnv)) delete process.env[k];
  });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GoToSyncController.quickSync()", () => {
  it("retorna fetched, created e skipped do use case", async () => {
    const syncUseCase = makeFakeSync({ fetched: 5, created: 3, skipped: 2 });
    const controller = new GoToSyncController(syncUseCase);

    const result = await controller.quickSync(undefined);

    expect(result).toEqual({ fetched: 5, created: 3, skipped: 2 });
  });

  it("usa janela padrão de 2h (sinceDaysAgo ≈ 0.0833) quando sinceHoursAgo não é fornecido", async () => {
    const syncUseCase = makeFakeSync();
    const controller = new GoToSyncController(syncUseCase);

    await controller.quickSync(undefined);

    expect(syncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sinceDaysAgo: expect.closeTo(2 / 24, 5),
      }),
    );
  });

  it("converte sinceHoursAgo para sinceDaysAgo corretamente", async () => {
    const syncUseCase = makeFakeSync();
    const controller = new GoToSyncController(syncUseCase);

    await controller.quickSync("4");

    expect(syncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sinceDaysAgo: expect.closeTo(4 / 24, 5),
      }),
    );
  });

  it("passa o ownerId vindo do env para o use case", async () => {
    process.env.GOTO_DEFAULT_OWNER_ID = "owner-abc";
    const syncUseCase = makeFakeSync();
    const controller = new GoToSyncController(syncUseCase);

    await controller.quickSync(undefined);

    expect(syncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "owner-abc" }),
    );
  });

  it("usa string vazia como ownerId quando env não está definido", async () => {
    delete process.env.GOTO_DEFAULT_OWNER_ID;
    const syncUseCase = makeFakeSync();
    const controller = new GoToSyncController(syncUseCase);

    await controller.quickSync(undefined);

    expect(syncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "" }),
    );
  });

  it("clipa sinceHoursAgo inválido (NaN) para o padrão de 2h", async () => {
    const syncUseCase = makeFakeSync();
    const controller = new GoToSyncController(syncUseCase);

    await controller.quickSync("nao-e-numero");

    expect(syncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sinceDaysAgo: expect.closeTo(2 / 24, 5),
      }),
    );
  });

  it("clipa sinceHoursAgo <= 0 para o padrão de 2h", async () => {
    const syncUseCase = makeFakeSync();
    const controller = new GoToSyncController(syncUseCase);

    await controller.quickSync("0");

    expect(syncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sinceDaysAgo: expect.closeTo(2 / 24, 5),
      }),
    );
  });

  it("clipa sinceHoursAgo > 24 para 24h máximo", async () => {
    const syncUseCase = makeFakeSync();
    const controller = new GoToSyncController(syncUseCase);

    await controller.quickSync("48");

    expect(syncUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        sinceDaysAgo: expect.closeTo(24 / 24, 5),
      }),
    );
  });
});
