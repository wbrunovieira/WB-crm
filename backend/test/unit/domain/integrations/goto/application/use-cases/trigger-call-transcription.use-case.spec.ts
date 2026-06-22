import { describe, it, expect, beforeEach, vi } from "vitest";
import { TriggerCallTranscriptionUseCase } from "@/domain/integrations/goto/application/use-cases/trigger-call-transcription.use-case";
import { ProcessCallRecordingUseCase } from "@/domain/integrations/goto/application/use-cases/process-call-recording.use-case";
import { PollCallTranscriptionsUseCase } from "@/domain/integrations/goto/application/use-cases/poll-call-transcriptions.use-case";
import {
  RecordingNotFoundError,
  RecordingForbiddenError,
} from "@/domain/integrations/goto/application/use-cases/get-call-recording-key.use-case";
import { right } from "@/core/either";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Activity } from "@/domain/activities/enterprise/entities/activity";

function makeActivity(overrides: Partial<Parameters<typeof Activity.create>[0]> = {}): Activity {
  return Activity.create(
    {
      ownerId: "owner-001",
      type: "call",
      subject: "Ligação",
      completed: true,
      completedAt: new Date(),
      gotoCallId: "call-123",
      gotoRecordingId: "rec-123",
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      ...overrides,
    },
    new UniqueEntityID("activity-001"),
  );
}

let repo: FakeActivitiesRepository;
let process: { execute: ReturnType<typeof vi.fn> };
let poll: { execute: ReturnType<typeof vi.fn> };
let useCase: TriggerCallTranscriptionUseCase;

beforeEach(() => {
  repo = new FakeActivitiesRepository();
  process = { execute: vi.fn().mockResolvedValue(right({ submitted: true })) };
  poll = { execute: vi.fn().mockResolvedValue(right({ pending: true })) };
  useCase = new TriggerCallTranscriptionUseCase(
    repo,
    process as unknown as ProcessCallRecordingUseCase,
    poll as unknown as PollCallTranscriptionsUseCase,
  );
});

describe("TriggerCallTranscriptionUseCase", () => {
  it("returns NotFound when the activity does not exist", async () => {
    const result = await useCase.execute({
      activityId: "missing",
      requesterId: "owner-001",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(RecordingNotFoundError);
    expect(process.execute).not.toHaveBeenCalled();
  });

  it("forbids a non-admin who does not own the activity", async () => {
    repo.items.push(makeActivity({ ownerId: "owner-001" }));

    const result = await useCase.execute({
      activityId: "activity-001",
      requesterId: "someone-else",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(RecordingForbiddenError);
    expect(process.execute).not.toHaveBeenCalled();
  });

  it("lets an admin transcribe another user's call", async () => {
    repo.items.push(makeActivity({ ownerId: "owner-001" }));

    const result = await useCase.execute({
      activityId: "activity-001",
      requesterId: "admin-999",
      requesterRole: "admin",
    });

    expect(result.isRight()).toBe(true);
    expect(process.execute).toHaveBeenCalledWith({ activityId: "activity-001" });
  });

  it("short-circuits when the transcript already exists", async () => {
    repo.items.push(makeActivity({ gotoTranscriptText: "[]" }));

    const result = await useCase.execute({
      activityId: "activity-001",
      requesterId: "owner-001",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.alreadyDone).toBe(true);
    expect(process.execute).not.toHaveBeenCalled();
    expect(poll.execute).not.toHaveBeenCalled();
  });

  it("returns NotFound when there is no recording to transcribe", async () => {
    repo.items.push(makeActivity({ gotoRecordingId: undefined, gotoCallId: undefined }));

    const result = await useCase.execute({
      activityId: "activity-001",
      requesterId: "owner-001",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(RecordingNotFoundError);
  });

  it("runs both passes and reports pending when jobs are still running", async () => {
    repo.items.push(makeActivity());

    const result = await useCase.execute({
      activityId: "activity-001",
      requesterId: "owner-001",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    expect(process.execute).toHaveBeenCalledWith({ activityId: "activity-001" });
    expect(poll.execute).toHaveBeenCalledWith({ activityId: "activity-001" });
    if (result.isRight()) {
      expect(result.value).toMatchObject({
        alreadyDone: false,
        submitted: true,
        saved: false,
        pending: true,
      });
    }
  });

  it("reports saved (not pending) when the immediate poll finds finished jobs", async () => {
    repo.items.push(makeActivity());
    poll.execute.mockResolvedValue(right({ saved: true }));

    const result = await useCase.execute({
      activityId: "activity-001",
      requesterId: "owner-001",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.saved).toBe(true);
      expect(result.value.pending).toBe(false);
    }
  });
});
