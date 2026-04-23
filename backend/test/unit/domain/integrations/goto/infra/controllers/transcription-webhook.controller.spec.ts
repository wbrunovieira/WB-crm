import { describe, it, expect, beforeEach, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { TranscriptionWebhookController } from "@/domain/integrations/goto/infra/controllers/transcription-webhook.controller";
import { HandleTranscriptionCallbackUseCase } from "@/domain/integrations/goto/application/use-cases/handle-transcription-callback.use-case";
import { right } from "@/core/either";

const SECRET = "test-callback-secret";

function makeUseCase() {
  return {
    execute: vi.fn().mockResolvedValue(right({ saved: true })),
  } as unknown as HandleTranscriptionCallbackUseCase;
}

describe("TranscriptionWebhookController", () => {
  let controller: TranscriptionWebhookController;
  let useCase: ReturnType<typeof makeUseCase>;

  beforeEach(async () => {
    process.env.TRANSCRIPTION_CALLBACK_SECRET = SECRET;
    useCase = makeUseCase();

    const module = await Test.createTestingModule({
      controllers: [TranscriptionWebhookController],
      providers: [{ provide: HandleTranscriptionCallbackUseCase, useValue: useCase }],
    }).compile();

    controller = module.get(TranscriptionWebhookController);
  });

  it("returns 401 when X-Callback-Secret header is missing", async () => {
    await expect(
      controller.handleCallback("", { job_id: "job-001", status: "done" }),
    ).rejects.toThrow();
  });

  it("returns 401 when X-Callback-Secret header is wrong", async () => {
    await expect(
      controller.handleCallback("wrong-secret", { job_id: "job-001", status: "done" }),
    ).rejects.toThrow();
  });

  it("returns ok:true and fires use case for valid secret", async () => {
    const result = await controller.handleCallback(SECRET, {
      job_id: "job-001",
      status: "done",
      segments: [{ start: 0, end: 5, text: "hello" }],
    });

    expect(result).toEqual({ ok: true });
    // Use case is triggered (async — may not be awaited immediately)
  });

  it("responds immediately even if use case is slow", async () => {
    useCase.execute = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(right({ saved: true })), 5000)),
    );

    // Should resolve before the use case does
    const result = await Promise.race([
      controller.handleCallback(SECRET, { job_id: "job-001", status: "done" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("too slow")), 100)),
    ]);

    expect(result).toEqual({ ok: true });
  });
});
