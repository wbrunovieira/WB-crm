import { describe, it, expect, beforeEach, vi } from "vitest";
import { GotoTranscriptionPollerListener } from "@/domain/integrations/goto/infra/listeners/goto-transcription-poller.listener";
import { GotoTranscriptionSubmittedEvent } from "@/domain/integrations/goto/enterprise/events/goto-transcription-submitted.event";
import { right } from "@/core/either";

const makeListener = (pollTranscriptions: { execute: ReturnType<typeof vi.fn> }, maxAttempts = 3) =>
  new GotoTranscriptionPollerListener(pollTranscriptions as any, 0, maxAttempts);

describe("GotoTranscriptionPollerListener", () => {
  let pollTranscriptions: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    pollTranscriptions = { execute: vi.fn() };
  });

  it("stops immediately when transcript is saved on first attempt", async () => {
    pollTranscriptions.execute.mockResolvedValue(right({ saved: true }));
    const listener = makeListener(pollTranscriptions);

    await listener.handle(new GotoTranscriptionSubmittedEvent("act-1"));

    expect(pollTranscriptions.execute).toHaveBeenCalledTimes(1);
  });

  it("stops immediately when skipped (no pending jobs)", async () => {
    pollTranscriptions.execute.mockResolvedValue(right({ skipped: true }));
    const listener = makeListener(pollTranscriptions);

    await listener.handle(new GotoTranscriptionSubmittedEvent("act-1"));

    expect(pollTranscriptions.execute).toHaveBeenCalledTimes(1);
  });

  it("retries while pending and stops when saved", async () => {
    pollTranscriptions.execute
      .mockResolvedValueOnce(right({ pending: true }))
      .mockResolvedValueOnce(right({ pending: true }))
      .mockResolvedValueOnce(right({ saved: true }));
    const listener = makeListener(pollTranscriptions, 5);

    await listener.handle(new GotoTranscriptionSubmittedEvent("act-1"));

    expect(pollTranscriptions.execute).toHaveBeenCalledTimes(3);
  });

  it("stops after maxAttempts without saving", async () => {
    pollTranscriptions.execute.mockResolvedValue(right({ pending: true }));
    const listener = makeListener(pollTranscriptions, 3);

    await listener.handle(new GotoTranscriptionSubmittedEvent("act-1"));

    expect(pollTranscriptions.execute).toHaveBeenCalledTimes(3);
  });

  it("passes activityId to pollTranscriptions on every attempt", async () => {
    pollTranscriptions.execute
      .mockResolvedValueOnce(right({ pending: true }))
      .mockResolvedValueOnce(right({ saved: true }));
    const listener = makeListener(pollTranscriptions);

    await listener.handle(new GotoTranscriptionSubmittedEvent("act-999"));

    expect(pollTranscriptions.execute).toHaveBeenCalledWith({ activityId: "act-999" });
  });

  it("does not throw when pollTranscriptions throws", async () => {
    pollTranscriptions.execute.mockRejectedValue(new Error("DB error"));
    const listener = makeListener(pollTranscriptions, 1);

    await expect(
      listener.handle(new GotoTranscriptionSubmittedEvent("act-1")),
    ).resolves.not.toThrow();
  });
});
