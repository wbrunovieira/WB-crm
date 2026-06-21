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

function setupDoneJobs(agentSegments = [{ start: 0, end: 5, text: "Hi" }], clientSegments = [{ start: 6, end: 9, text: "Hey" }]) {
  transcriber.addJobStatus("job-agent-001", { jobId: "job-agent-001", status: "done" });
  transcriber.addJobStatus("job-client-001", { jobId: "job-client-001", status: "done" });
  transcriber.addJobResult("job-agent-001", { jobId: "job-agent-001", text: "agent", language: "pt", durationSeconds: 30, segments: agentSegments });
  transcriber.addJobResult("job-client-001", { jobId: "job-client-001", text: "client", language: "pt", durationSeconds: 30, segments: clientSegments });
}

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

  it("emits a single stream from the agent leg (no duplication across legs)", async () => {
    // Both GoTo legs record the full duplex conversation, so the client leg is
    // a near-duplicate of the agent leg. We must NOT interleave both — only the
    // agent leg is saved, with no speaker attribution.
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

    // Client leg captured the same conversation (would be duplicates) — ignored.
    transcriber.addJobResult("job-client-001", {
      jobId: "job-client-001",
      text: "Client text",
      language: "pt",
      durationSeconds: 60,
      segments: [
        { start: 2, end: 6, text: "Hello" },
        { start: 12, end: 16, text: "How are you?" },
      ],
    });

    const result = await useCase.execute({ activityId: "activity-001" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ saved: true });

    const saved = repo.items[0];
    expect(saved.gotoTranscriptText).toBeDefined();

    const transcript = JSON.parse(saved.gotoTranscriptText!);
    // Only the agent leg — no duplication from the client leg.
    expect(transcript).toHaveLength(2);
    expect(transcript.map((s: { text: string }) => s.text)).toEqual(["Hello", "How are you?"]);
    // Single neutral stream — no per-leg speaker attribution.
    expect(transcript.every((s: { speaker: string }) => s.speaker === "agent")).toBe(true);
    expect(transcript.every((s: { speakerName: string }) => s.speakerName === "")).toBe(true);
  });

  it("falls back to the client leg, realigned by the leg offset, when the agent leg is empty", async () => {
    // Agent leg started at 13:40:30Z, client leg 12s later at 13:40:42Z.
    const activity = makeActivity({
      gotoRecordingUrl: "2026/06/19/2026-06-19T13:40:30Z~call~a.mp3",
      gotoRecordingUrl2: "2026/06/19/2026-06-19T13:40:42Z~call~b.mp3",
    });
    repo.items.push(activity);

    transcriber.addJobStatus("job-agent-001", { jobId: "job-agent-001", status: "done" });
    transcriber.addJobStatus("job-client-001", { jobId: "job-client-001", status: "done" });

    transcriber.addJobResult("job-agent-001", {
      jobId: "job-agent-001",
      text: "",
      language: "pt",
      durationSeconds: 60,
      segments: [],
    });
    transcriber.addJobResult("job-client-001", {
      jobId: "job-client-001",
      text: "Client text",
      language: "pt",
      durationSeconds: 60,
      segments: [{ start: 5, end: 9, text: "Oi" }],
    });

    await useCase.execute({ activityId: "activity-001" });

    const transcript = JSON.parse(repo.items[0].gotoTranscriptText!);
    expect(transcript).toHaveLength(1);
    // 5s within the client recording → 5 + 12 = 17s on the agent timeline.
    expect(transcript[0].start).toBe(17);
    expect(transcript[0].end).toBe(21);
    expect(transcript[0].speaker).toBe("agent");
    expect(transcript[0].speakerName).toBe("");
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

  it("does not attribute speakers — single neutral stream without names", async () => {
    // The transcriber does not diarize, and each leg holds both voices, so we
    // never label segments with a resolved owner/client name.
    const activity = makeActivity({ contactId: "contact-001" });
    repo.items.push(activity);
    repo.setNames("activity-001", { ownerName: "Bruno Vieira", clientName: "João Silva" });
    setupDoneJobs();

    await useCase.execute({ activityId: "activity-001" });

    const transcript = JSON.parse(repo.items[0].gotoTranscriptText!);
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript.every((s: { speakerName: string }) => s.speakerName === "")).toBe(true);
    expect(transcript.some((s: { speakerName: string }) => s.speakerName === "Bruno Vieira")).toBe(false);
    expect(transcript.some((s: { speakerName: string }) => s.speakerName === "João Silva")).toBe(false);
  });
});
