import { describe, it, expect, beforeEach } from "vitest";
import { HandleTranscriptionCallbackUseCase } from "@/domain/integrations/goto/application/use-cases/handle-transcription-callback.use-case";
import { PollCallTranscriptionsUseCase } from "@/domain/integrations/goto/application/use-cases/poll-call-transcriptions.use-case";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Activity } from "@/domain/activities/enterprise/entities/activity";

function makeActivity(
  id: string,
  overrides: Partial<Parameters<typeof Activity.create>[0]> = {},
): Activity {
  return Activity.create(
    {
      ownerId: "owner-001",
      type: "call",
      subject: "Test call",
      completed: true,
      completedAt: new Date(),
      gotoCallId: "call-001",
      gotoRecordingId: "rec-001",
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
      ...overrides,
    },
    new UniqueEntityID(id),
  );
}

let repo: FakeActivitiesRepository;
let transcriber: FakeTranscriberPort;
let pollUseCase: PollCallTranscriptionsUseCase;
let useCase: HandleTranscriptionCallbackUseCase;

beforeEach(() => {
  repo = new FakeActivitiesRepository();
  transcriber = new FakeTranscriberPort();
  pollUseCase = new PollCallTranscriptionsUseCase(repo, transcriber);
  useCase = new HandleTranscriptionCallbackUseCase(repo, pollUseCase);
});

describe("HandleTranscriptionCallbackUseCase", () => {
  it("returns skipped when no activity found for jobId", async () => {
    const result = await useCase.execute({ jobId: "job-unknown", status: "done" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ skipped: true });
  });

  it("returns skipped when activity already has transcript", async () => {
    const activity = makeActivity("act-001", {
      gotoTranscriptionJobId: "job-001",
      gotoTranscriptText: JSON.stringify([{ start: 0, end: 5, text: "hello", speaker: "agent", speakerName: "Agent" }]),
    });
    repo.items.push(activity);

    const result = await useCase.execute({ jobId: "job-001", status: "done" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ skipped: true });
  });

  it("triggers poll and saves transcript when both jobs are done", async () => {
    const activity = makeActivity("act-001", {
      gotoTranscriptionJobId: "job-agent",
      gotoTranscriptionJobId2: "job-client",
    });
    repo.items.push(activity);
    repo.setNames("act-001", { ownerName: "Bruno", clientName: "Cliente" });

    transcriber.addJobStatus("job-agent", { jobId: "job-agent", status: "done" });
    transcriber.addJobStatus("job-client", { jobId: "job-client", status: "done" });
    transcriber.addJobResult("job-agent", {
      jobId: "job-agent",
      text: "hello",
      language: "pt",
      durationSeconds: 5,
      segments: [{ start: 0, end: 5, text: "hello" }],
    });
    transcriber.addJobResult("job-client", {
      jobId: "job-client",
      text: "world",
      language: "pt",
      durationSeconds: 5,
      segments: [{ start: 2, end: 7, text: "world" }],
    });

    const result = await useCase.execute({ jobId: "job-agent", status: "done" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ saved: true });
    expect(repo.items[0].gotoTranscriptText).toBeTruthy();
    expect(repo.items[0].gotoTranscriptionJobId).toBeUndefined();
  });

  it("returns pending when the other job is still running", async () => {
    const activity = makeActivity("act-001", {
      gotoTranscriptionJobId: "job-agent",
      gotoTranscriptionJobId2: "job-client",
    });
    repo.items.push(activity);

    transcriber.addJobStatus("job-agent", { jobId: "job-agent", status: "done" });
    transcriber.addJobStatus("job-client", { jobId: "job-client", status: "pending" });

    const result = await useCase.execute({ jobId: "job-agent", status: "done" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ pending: true });
    expect(repo.items[0].gotoTranscriptText).toBeUndefined();
  });

  it("works when activity has only one job (agent track only)", async () => {
    const activity = makeActivity("act-001", {
      gotoTranscriptionJobId: "job-agent",
    });
    repo.items.push(activity);
    repo.setNames("act-001", { ownerName: "Bruno", clientName: "Cliente" });

    transcriber.addJobStatus("job-agent", { jobId: "job-agent", status: "done" });
    transcriber.addJobResult("job-agent", {
      jobId: "job-agent",
      text: "só agente",
      language: "pt",
      durationSeconds: 3,
      segments: [{ start: 0, end: 3, text: "só agente" }],
    });

    const result = await useCase.execute({ jobId: "job-agent", status: "done" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ saved: true });
  });

  it("finds activity by client job ID (job2)", async () => {
    const activity = makeActivity("act-002", {
      gotoTranscriptionJobId: "job-agent",
      gotoTranscriptionJobId2: "job-client",
    });
    repo.items.push(activity);
    repo.setNames("act-002", { ownerName: "Bruno", clientName: "Cliente" });

    transcriber.addJobStatus("job-agent", { jobId: "job-agent", status: "done" });
    transcriber.addJobStatus("job-client", { jobId: "job-client", status: "done" });
    transcriber.addJobResult("job-agent", {
      jobId: "job-agent",
      text: "a",
      language: "pt",
      durationSeconds: 1,
      segments: [{ start: 0, end: 1, text: "a" }],
    });
    transcriber.addJobResult("job-client", {
      jobId: "job-client",
      text: "b",
      language: "pt",
      durationSeconds: 1,
      segments: [{ start: 0.5, end: 1.5, text: "b" }],
    });

    // Callback arrives for client job
    const result = await useCase.execute({ jobId: "job-client", status: "done" });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ saved: true });
  });

  it("treats failed callback status as terminal — poll merges what is available", async () => {
    const activity = makeActivity("act-001", {
      gotoTranscriptionJobId: "job-agent",
    });
    repo.items.push(activity);
    repo.setNames("act-001", { ownerName: "Bruno", clientName: "Cliente" });

    // Agent job failed — poll should still finalize with no segments
    transcriber.addJobStatus("job-agent", { jobId: "job-agent", status: "failed", error: "timeout" });

    const result = await useCase.execute({ jobId: "job-agent", status: "failed" });

    expect(result.isRight()).toBe(true);
    // Poll resolves terminal state (failed = terminal) — saves empty/partial transcript
    expect(result.value.saved ?? result.value.skipped).toBeTruthy();
  });
});
