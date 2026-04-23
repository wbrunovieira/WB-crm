import { describe, it, expect, beforeEach, vi } from "vitest";
import { GotoActivityCreatedListener } from "@/domain/integrations/goto/infra/listeners/goto-activity-created.listener";
import { GotoActivityCreatedEvent } from "@/domain/integrations/goto/enterprise/events/goto-activity-created.event";
import { right } from "@/core/either";

const makeListener = (processRecording: { execute: ReturnType<typeof vi.fn> }, eventEmitter: { emit: ReturnType<typeof vi.fn> }) =>
  new GotoActivityCreatedListener(processRecording as any, eventEmitter as any, 0);

describe("GotoActivityCreatedListener", () => {
  let processRecording: { execute: ReturnType<typeof vi.fn> };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let listener: GotoActivityCreatedListener;

  beforeEach(() => {
    processRecording = { execute: vi.fn() };
    eventEmitter = { emit: vi.fn() };
    listener = makeListener(processRecording, eventEmitter);
  });

  it("calls processRecording with the activity id", async () => {
    processRecording.execute.mockResolvedValue(right({ submitted: true }));

    await listener.handle(new GotoActivityCreatedEvent("act-123"));

    expect(processRecording.execute).toHaveBeenCalledWith({ activityId: "act-123" });
  });

  it("emits goto.transcription.submitted when recording is submitted", async () => {
    processRecording.execute.mockResolvedValue(right({ submitted: true }));

    await listener.handle(new GotoActivityCreatedEvent("act-123"));

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "goto.transcription.submitted",
      expect.objectContaining({ activityId: "act-123" }),
    );
  });

  it("does not emit when recording is not found in S3", async () => {
    processRecording.execute.mockResolvedValue(right({ notFound: true }));

    await listener.handle(new GotoActivityCreatedEvent("act-123"));

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it("does not emit when recording was already processed (skipped)", async () => {
    processRecording.execute.mockResolvedValue(right({ skipped: true }));

    await listener.handle(new GotoActivityCreatedEvent("act-123"));

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it("does not throw when processRecording throws", async () => {
    processRecording.execute.mockRejectedValue(new Error("S3 offline"));

    await expect(listener.handle(new GotoActivityCreatedEvent("act-123"))).resolves.not.toThrow();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
