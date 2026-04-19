import { describe, it, expect, beforeEach } from "vitest";
import { PollWhatsAppTranscriptionsUseCase } from "@/domain/integrations/whatsapp/application/use-cases/poll-whatsapp-transcriptions.use-case";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";
import { WhatsAppMessageData } from "@/domain/integrations/whatsapp/application/repositories/whatsapp-messages.repository";

const OWNER_ID = "owner-001";
const JOB_ID = "job-wa-001";

function makeWaMessage(overrides: Partial<WhatsAppMessageData> = {}): WhatsAppMessageData {
  return {
    id: "wa-msg-001",
    messageId: "evolution-001",
    remoteJid: "5511999@s.whatsapp.net",
    fromMe: false,
    messageType: "audioMessage",
    pushName: "João",
    timestamp: new Date(),
    activityId: "activity-001",
    ownerId: OWNER_ID,
    mediaTranscriptionJobId: JOB_ID,
    ...overrides,
  };
}

let repo: FakeWhatsAppMessagesRepository;
let transcriber: FakeTranscriberPort;
let useCase: PollWhatsAppTranscriptionsUseCase;

beforeEach(() => {
  repo = new FakeWhatsAppMessagesRepository();
  transcriber = new FakeTranscriberPort();
  useCase = new PollWhatsAppTranscriptionsUseCase(repo, transcriber);
});

describe("PollWhatsAppTranscriptionsUseCase", () => {
  it("skips messages still pending", async () => {
    repo.items.push(makeWaMessage());
    transcriber.addJobStatus(JOB_ID, { jobId: JOB_ID, status: "pending" });

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ polled: 1, saved: 0, failed: 0 });

    const msg = repo.items[0];
    expect(msg.mediaTranscriptText).toBeUndefined();
    expect(msg.mediaTranscriptionJobId).toBe(JOB_ID);
  });

  it("skips messages still processing", async () => {
    repo.items.push(makeWaMessage());
    transcriber.addJobStatus(JOB_ID, { jobId: JOB_ID, status: "processing" });

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ polled: 1, saved: 0, failed: 0 });
  });

  it("saves transcript when done and clears jobId", async () => {
    repo.items.push(makeWaMessage());
    transcriber.addJobStatus(JOB_ID, { jobId: JOB_ID, status: "done" });
    transcriber.addJobResult(JOB_ID, {
      jobId: JOB_ID,
      text: "Olá, como vai?",
      language: "pt",
      durationSeconds: 5,
      segments: [
        { start: 0, end: 2, text: "Olá," },
        { start: 2, end: 5, text: "como vai?" },
      ],
    });

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ polled: 1, saved: 1, failed: 0 });

    const msg = repo.items[0];
    expect(msg.mediaTranscriptText).toBeDefined();
    expect(msg.mediaTranscriptText).toContain("João");
    expect(msg.mediaTranscriptionJobId).toBeNull();
  });

  it("clears jobId when failed (no crash)", async () => {
    repo.items.push(makeWaMessage());
    transcriber.addJobStatus(JOB_ID, { jobId: JOB_ID, status: "failed", error: "Transcription error" });

    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ polled: 1, saved: 0, failed: 1 });

    // jobId should be cleared
    const msg = repo.items[0];
    expect(msg.mediaTranscriptionJobId).toBeNull();
  });

  it("formats speaker as 'Agente' for fromMe=true messages", async () => {
    repo.items.push(makeWaMessage({ fromMe: true, pushName: "Me" }));
    transcriber.addJobStatus(JOB_ID, { jobId: JOB_ID, status: "done" });
    transcriber.addJobResult(JOB_ID, {
      jobId: JOB_ID,
      text: "Bom dia!",
      language: "pt",
      durationSeconds: 2,
      segments: [{ start: 0, end: 2, text: "Bom dia!" }],
    });

    await useCase.execute();

    const msg = repo.items[0];
    expect(msg.mediaTranscriptText).toContain("Agente");
    expect(msg.mediaTranscriptText).not.toContain("Me");
  });

  it("formats speaker as pushName for fromMe=false messages", async () => {
    repo.items.push(makeWaMessage({ fromMe: false, pushName: "Maria" }));
    transcriber.addJobStatus(JOB_ID, { jobId: JOB_ID, status: "done" });
    transcriber.addJobResult(JOB_ID, {
      jobId: JOB_ID,
      text: "Preciso de ajuda",
      language: "pt",
      durationSeconds: 3,
      segments: [{ start: 0, end: 3, text: "Preciso de ajuda" }],
    });

    await useCase.execute();

    const msg = repo.items[0];
    expect(msg.mediaTranscriptText).toContain("Maria");
  });

  it("formats speaker as 'Cliente' when pushName is null for fromMe=false", async () => {
    repo.items.push(makeWaMessage({ fromMe: false, pushName: null }));
    transcriber.addJobStatus(JOB_ID, { jobId: JOB_ID, status: "done" });
    transcriber.addJobResult(JOB_ID, {
      jobId: JOB_ID,
      text: "Oi",
      language: "pt",
      durationSeconds: 1,
      segments: [{ start: 0, end: 1, text: "Oi" }],
    });

    await useCase.execute();

    const msg = repo.items[0];
    expect(msg.mediaTranscriptText).toContain("Cliente");
  });

  it("returns polled=0 when no pending transcriptions", async () => {
    const result = await useCase.execute();

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ polled: 0, saved: 0, failed: 0 });
  });
});
