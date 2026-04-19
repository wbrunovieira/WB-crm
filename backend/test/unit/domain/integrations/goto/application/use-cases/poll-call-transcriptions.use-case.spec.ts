import { describe, it, expect, beforeEach } from "vitest";
import { PollCallTranscriptionsUseCase } from "@/domain/integrations/goto/application/use-cases/poll-call-transcriptions.use-case";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Activity } from "@/domain/activities/enterprise/entities/activity";

function makeActivity(overrides: Partial<Parameters<typeof Activity.create>[0]> = {}): Activity {
  return Activity.create(
    {
      ownerId: "owner-001",
      type: "call",
      subject: "Test call",
      completed: true,
      completedAt: new Date(),
      gotoCallId: "call-123",
      gotoTranscriptionJobId: "job-agent-001",
      gotoTranscriptionJobId2: "job-client-001",
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
let transcriber: FakeTranscriberPort;
let useCase: PollCallTranscriptionsUseCase;

beforeEach(() => {
  repo = new FakeActivitiesRepository();
  transcriber = new FakeTranscriberPort();
  useCase = new PollCallTranscriptionsUseCase(repo, transcriber);
});

describe("PollCallTranscriptionsUseCase", () => {
  it("skips jobs still in progress", async () => {
    const activity = makeActivity();
    repo.items.push(activity);

    transcriber.addJobStatus("job-agent-001", { jobId: "job-agent-001", status: "processing" });
    transcriber.addJobStatus("job-client-001", { jobId: "job-client-001", status: "done" });

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ pending: true });
    // Transcript not saved yet
    const saved = repo.items[0];
    expect(saved.gotoTranscriptText).toBeUndefined();
  });

  it("interleaves segments by timestamp when both done", async () => {
    const activity = makeActivity();
    repo.items.push(activity);

    transcriber.addJobStatus("job-agent-001", { jobId: "job-agent-001", status: "done" });
    transcriber.addJobStatus("job-client-001", { jobId: "job-client-001", status: "done" });

    transcriber.addJobResult("job-agent-001", {
      jobId: "job-agent-001",
      text: "Agent text",
      language: "pt",
      durationSeconds: 60,
      segments: [
        { start: 0, end: 5, text: "Hello" },
        { start: 10, end: 15, text: "How are you?" },
      ],
    });

    transcriber.addJobResult("job-client-001", {
      jobId: "job-client-001",
      text: "Client text",
      language: "pt",
      durationSeconds: 60,
      segments: [
        { start: 6, end: 9, text: "Hi there!" },
        { start: 16, end: 20, text: "I'm fine!" },
      ],
    });

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ saved: true });

    const saved = repo.items[0];
    expect(saved.gotoTranscriptText).toBeDefined();

    const transcript = JSON.parse(saved.gotoTranscriptText!);
    expect(transcript).toHaveLength(4);

    // Verify interleaved by timestamp
    expect(transcript[0].start).toBe(0);
    expect(transcript[0].speaker).toBe("agent");
    expect(transcript[1].start).toBe(6);
    expect(transcript[1].speaker).toBe("client");
    expect(transcript[2].start).toBe(10);
    expect(transcript[2].speaker).toBe("agent");
    expect(transcript[3].start).toBe(16);
    expect(transcript[3].speaker).toBe("client");
  });

  it("handles one track failed (uses only successful one)", async () => {
    const activity = makeActivity();
    repo.items.push(activity);

    transcriber.addJobStatus("job-agent-001", { jobId: "job-agent-001", status: "done" });
    transcriber.addJobStatus("job-client-001", { jobId: "job-client-001", status: "failed", error: "Error" });

    transcriber.addJobResult("job-agent-001", {
      jobId: "job-agent-001",
      text: "Agent text",
      language: "pt",
      durationSeconds: 60,
      segments: [{ start: 0, end: 5, text: "Hello" }],
    });

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ saved: true });

    const saved = repo.items[0];
    const transcript = JSON.parse(saved.gotoTranscriptText!);
    // Only agent segments
    expect(transcript).toHaveLength(1);
    expect(transcript[0].speaker).toBe("agent");
  });

  it("clears job IDs after saving transcript", async () => {
    const activity = makeActivity();
    repo.items.push(activity);

    transcriber.addJobStatus("job-agent-001", { jobId: "job-agent-001", status: "done" });
    transcriber.addJobStatus("job-client-001", { jobId: "job-client-001", status: "done" });

    transcriber.addJobResult("job-agent-001", {
      jobId: "job-agent-001",
      text: "text",
      language: "pt",
      durationSeconds: 30,
      segments: [],
    });
    transcriber.addJobResult("job-client-001", {
      jobId: "job-client-001",
      text: "text",
      language: "pt",
      durationSeconds: 30,
      segments: [],
    });

    await useCase.execute({ activityId: "activity-001" });

    const saved = repo.items[0];
    expect(saved.gotoTranscriptionJobId).toBeUndefined();
    expect(saved.gotoTranscriptionJobId2).toBeUndefined();
  });

  it("skips activity that already has transcript", async () => {
    const activity = makeActivity({ gotoTranscriptText: '[]' });
    repo.items.push(activity);

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ skipped: true });
    expect(transcriber.submittedJobs).toHaveLength(0);
  });

  it("skips activity with no pending jobs", async () => {
    const activity = makeActivity({
      gotoTranscriptionJobId: undefined,
      gotoTranscriptionJobId2: undefined,
    });
    repo.items.push(activity);

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ skipped: true });
  });
});
