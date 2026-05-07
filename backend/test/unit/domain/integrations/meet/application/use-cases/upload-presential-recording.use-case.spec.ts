import { describe, it, expect, beforeEach, vi } from "vitest";
import { UploadPresentialRecordingUseCase } from "@/domain/integrations/meet/application/use-cases/upload-presential-recording.use-case";
import { FakeMeetingsRepository } from "../../fakes/fake-meetings.repository";
import { PresentialRecordingStoragePort } from "@/domain/integrations/meet/application/ports/presential-recording-storage.port";
import { TranscriberPort } from "@/infra/shared/transcriber/transcriber.port";

class FakeStorage extends PresentialRecordingStoragePort {
  public uploads: Array<{ key: string; contentType: string }> = [];
  public signedUrls: Map<string, string> = new Map();
  public shouldFail = false;

  buildKey(meetingId: string, filename: string): string {
    return `presential/${meetingId}/${filename}`;
  }

  async upload(key: string, _buffer: Buffer, contentType: string): Promise<void> {
    if (this.shouldFail) throw new Error("S3 unavailable");
    this.uploads.push({ key, contentType });
  }

  async getSignedUrl(key: string): Promise<string> {
    return this.signedUrls.get(key) ?? `https://s3.example.com/${key}`;
  }
}

class FakeTranscriber extends TranscriberPort {
  public submittedJobs: Array<{ fileName: string }> = [];
  public shouldFail = false;

  async submitAudio(_buffer: Buffer, fileName: string): Promise<{ jobId: string }> {
    if (this.shouldFail) throw new Error("Transcriber unavailable");
    this.submittedJobs.push({ fileName });
    return { jobId: `job-${this.submittedJobs.length}` };
  }

  async submitVideo(_buffer: Buffer, fileName: string): Promise<{ jobId: string }> {
    this.submittedJobs.push({ fileName });
    return { jobId: `job-v-${this.submittedJobs.length}` };
  }

  async getStatus(): Promise<any> { return { jobId: "x", status: "pending" }; }
  async getResult(): Promise<any> { return null; }
}

function makeMeeting(overrides: Partial<{ status: string; isPresential: boolean }> = {}) {
  return {
    id: "meeting-1",
    title: "Reunião Presencial",
    isPresential: true,
    status: "ended",
    googleEventId: null,
    meetLink: null,
    startAt: new Date("2026-05-10T14:00:00Z"),
    endAt: new Date("2026-05-10T15:00:00Z"),
    actualStartAt: new Date("2026-05-10T14:05:00Z"),
    actualEndAt: new Date("2026-05-10T15:10:00Z"),
    attendeeEmails: "[]",
    organizerEmail: null,
    activityId: null,
    nativeTranscriptUrl: null,
    recordingDriveId: null,
    recordingUrl: null,
    uploadedAudioKey: null,
    transcriptText: null,
    meetingSummary: null,
    leadId: "lead-1",
    contactId: null,
    organizationId: null,
    dealId: null,
    ownerId: "owner-1",
    location: "Sala 1",
    confirmationMethod: null,
    confirmationSentAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("UploadPresentialRecordingUseCase", () => {
  let repo: FakeMeetingsRepository;
  let storage: FakeStorage;
  let transcriber: FakeTranscriber;
  let sut: UploadPresentialRecordingUseCase;

  beforeEach(() => {
    repo = new FakeMeetingsRepository();
    storage = new FakeStorage();
    transcriber = new FakeTranscriber();
    sut = new UploadPresentialRecordingUseCase(repo, storage, transcriber);
  });

  it("faz upload do áudio para S3 e submete ao transcritor", async () => {
    repo.addMeeting(makeMeeting());
    const buffer = Buffer.from("audio-data");

    const result = await sut.execute({
      meetingId: "meeting-1",
      buffer,
      filename: "gravacao.mp3",
      contentType: "audio/mpeg",
      requesterId: "owner-1",
    });

    expect(result.isRight()).toBe(true);
    expect(storage.uploads).toHaveLength(1);
    expect(storage.uploads[0].key).toContain("meeting-1");
    expect(storage.uploads[0].contentType).toBe("audio/mpeg");
    expect(transcriber.submittedJobs).toHaveLength(1);
  });

  it("salva uploadedAudioKey e transcriptionJobId na meeting", async () => {
    repo.addMeeting(makeMeeting());

    await sut.execute({
      meetingId: "meeting-1",
      buffer: Buffer.from("x"),
      filename: "audio.mp3",
      contentType: "audio/mpeg",
      requesterId: "owner-1",
    });

    const meeting = repo.items.find(m => m.id === "meeting-1")!;
    expect((meeting as any).uploadedAudioKey).toBeTruthy();
    expect((meeting as any).transcriptionJobId).toMatch(/^job-/);
  });

  it("retorna a signed URL do S3 no resultado", async () => {
    repo.addMeeting(makeMeeting());

    const result = await sut.execute({
      meetingId: "meeting-1",
      buffer: Buffer.from("x"),
      filename: "audio.mp3",
      contentType: "audio/mpeg",
      requesterId: "owner-1",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.playbackUrl).toContain("s3.example.com");
      expect(result.value.transcriptionJobId).toMatch(/^job-/);
    }
  });

  it("retorna erro quando meeting não encontrada", async () => {
    const result = await sut.execute({
      meetingId: "nao-existe",
      buffer: Buffer.from("x"),
      filename: "audio.mp3",
      contentType: "audio/mpeg",
      requesterId: "owner-1",
    });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
    expect((result.value as Error).message).toContain("não encontrada");
  });

  it("retorna erro quando meeting não é presencial", async () => {
    repo.addMeeting(makeMeeting({ isPresential: false }));

    const result = await sut.execute({
      meetingId: "meeting-1",
      buffer: Buffer.from("x"),
      filename: "audio.mp3",
      contentType: "audio/mpeg",
      requesterId: "owner-1",
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("presencial");
  });

  it("retorna erro quando meeting ainda não está concluída", async () => {
    repo.addMeeting(makeMeeting({ status: "scheduled" }));

    const result = await sut.execute({
      meetingId: "meeting-1",
      buffer: Buffer.from("x"),
      filename: "audio.mp3",
      contentType: "audio/mpeg",
      requesterId: "owner-1",
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("concluída");
  });

  it("retorna erro quando requester não é dono da meeting", async () => {
    repo.addMeeting(makeMeeting());

    const result = await sut.execute({
      meetingId: "meeting-1",
      buffer: Buffer.from("x"),
      filename: "audio.mp3",
      contentType: "audio/mpeg",
      requesterId: "outro-user",
    });

    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro quando S3 falha", async () => {
    repo.addMeeting(makeMeeting());
    storage.shouldFail = true;

    const result = await sut.execute({
      meetingId: "meeting-1",
      buffer: Buffer.from("x"),
      filename: "audio.mp3",
      contentType: "audio/mpeg",
      requesterId: "owner-1",
    });

    expect(result.isLeft()).toBe(true);
  });

  it("aceita vídeo e usa submitVideo quando contentType é video/*", async () => {
    repo.addMeeting(makeMeeting());

    await sut.execute({
      meetingId: "meeting-1",
      buffer: Buffer.from("x"),
      filename: "gravacao.mp4",
      contentType: "video/mp4",
      requesterId: "owner-1",
    });

    expect(transcriber.submittedJobs[0].fileName).toContain(".mp4");
  });
});
