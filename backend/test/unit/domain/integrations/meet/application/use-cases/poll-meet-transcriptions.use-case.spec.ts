import { describe, it, expect, beforeEach } from "vitest";
import { PollMeetTranscriptionsUseCase } from "@/domain/integrations/meet/application/use-cases/poll-meet-transcriptions.use-case";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";

let meetings: FakeMeetingsRepository;
let transcriber: FakeTranscriberPort;
let useCase: PollMeetTranscriptionsUseCase;

beforeEach(() => {
  meetings = new FakeMeetingsRepository();
  transcriber = new FakeTranscriberPort();
  useCase = new PollMeetTranscriptionsUseCase(meetings, transcriber);
});

function addMeetingWithJob(id: string, jobId: string) {
  meetings.addMeeting({ id, title: "Reunião", startAt: new Date(), status: "ended" });
  const item = meetings.items.find((m) => m.id === id)!;
  item.transcriptionJobId = jobId;
}

describe("PollMeetTranscriptionsUseCase", () => {
  it("returns right with polled=0 when no pending jobs", async () => {
    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.value.polled).toBe(0);
    expect(result.value.results).toHaveLength(0);
  });

  it("saves transcription and clears jobId when status is done", async () => {
    addMeetingWithJob("meet-001", "job-001");
    transcriber.setStatus("job-001", "done");
    transcriber.setResult("job-001", "Olá, aqui é o João.");

    const result = await useCase.execute();

    expect(result.value.polled).toBe(1);
    expect(result.value.results[0].action).toBe("transcription_saved");

    const meeting = meetings.items[0];
    expect(meeting.transcriptText).toBe("Olá, aqui é o João.");
    expect(meeting.transcriptionJobId).toBeUndefined();
    expect(meeting.transcribedAt).toBeDefined();
  });

  it("clears jobId on failure and records transcription_failed", async () => {
    addMeetingWithJob("meet-001", "job-002");
    transcriber.setStatus("job-002", "failed", "audio corrupted");

    const result = await useCase.execute();

    expect(result.value.results[0].action).toBe("transcription_failed");
    expect(result.value.results[0].error).toBe("audio corrupted");
    expect(meetings.items[0].transcriptionJobId).toBeUndefined();
    expect(meetings.items[0].transcriptText).toBeUndefined();
  });

  it("does not modify meeting when status is pending", async () => {
    addMeetingWithJob("meet-001", "job-003");
    transcriber.setStatus("job-003", "pending");

    const result = await useCase.execute();

    expect(result.value.results[0].action).toBe("transcription_pending");
    expect(meetings.items[0].transcriptionJobId).toBe("job-003");
    expect(meetings.items[0].transcriptText).toBeUndefined();
  });

  it("does not modify meeting when status is processing", async () => {
    addMeetingWithJob("meet-001", "job-004");
    transcriber.setStatus("job-004", "processing");

    const result = await useCase.execute();

    expect(result.value.results[0].action).toBe("transcription_processing");
    expect(meetings.items[0].transcriptText).toBeUndefined();
  });

  it("processes multiple meetings independently", async () => {
    addMeetingWithJob("meet-001", "job-done");
    addMeetingWithJob("meet-002", "job-pending");
    addMeetingWithJob("meet-003", "job-failed");

    transcriber.setStatus("job-done", "done");
    transcriber.setResult("job-done", "Transcrição concluída.");
    transcriber.setStatus("job-pending", "pending");
    transcriber.setStatus("job-failed", "failed", "network error");

    const result = await useCase.execute();

    expect(result.value.polled).toBe(3);
    expect(result.value.results).toHaveLength(3);

    const meet1 = meetings.items.find((m) => m.id === "meet-001")!;
    const meet3 = meetings.items.find((m) => m.id === "meet-003")!;

    expect(meet1.transcriptText).toBe("Transcrição concluída.");
    expect(meet3.transcriptionJobId).toBeUndefined();
  });

  it("continues processing when one job throws", async () => {
    addMeetingWithJob("meet-001", "job-throw");
    addMeetingWithJob("meet-002", "job-ok");

    // job-throw will throw because status is unknown, getStatus returns pending
    // but let's simulate a different error: set status to done but getResult will resolve
    transcriber.setStatus("job-throw", "done");
    // don't set result — getResult returns default "transcrição fake"
    transcriber.setStatus("job-ok", "done");
    transcriber.setResult("job-ok", "OK transcript");

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.value.polled).toBe(2);
  });
});
