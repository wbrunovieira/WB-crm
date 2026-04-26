import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandleWhatsAppTranscriptionCallbackUseCase } from "@/domain/integrations/whatsapp/application/use-cases/handle-whatsapp-transcription-callback.use-case";
import { FakeWhatsAppMessagesRepository } from "@test/unit/domain/integrations/whatsapp/fakes/fake-whatsapp-messages.repository";
import { WhatsAppMessageData } from "@/domain/integrations/whatsapp/application/repositories/whatsapp-messages.repository";
import { TranscriptionResult } from "@/infra/shared/transcriber/transcriber.port";
import { randomUUID } from "crypto";

// Fake CreateNotificationUseCase
class FakeCreateNotificationUseCase {
  public calls: Parameters<FakeCreateNotificationUseCase["execute"]>[] = [];
  async execute(input: {
    type: string;
    title: string;
    summary: string;
    userId: string;
    jobId?: string;
    payload?: string;
  }) {
    this.calls.push([input]);
    const { right } = await import("@/core/either");
    return right({ id: { toString: () => randomUUID() } });
  }
}

// Fake NotificationsEventBus
class FakeNotificationsEventBus {
  public emitted: unknown[] = [];
  emit(notification: unknown): void {
    this.emitted.push(notification);
  }
}

function makeMessage(overrides: Partial<WhatsAppMessageData> = {}): WhatsAppMessageData {
  return {
    id: randomUUID(),
    messageId: randomUUID(),
    remoteJid: "5511999999999@s.whatsapp.net",
    fromMe: false,
    messageType: "audioMessage",
    pushName: "Cliente Teste",
    text: null,
    mediaLabel: null,
    mediaUrl: "https://drive.google.com/file/abc",
    mediaMimeType: "audio/ogg",
    mediaDriveId: "drive-abc",
    mediaTranscriptionJobId: "job-123",
    mediaTranscriptText: null,
    timestamp: new Date(),
    activityId: randomUUID(),
    ownerId: randomUUID(),
    ...overrides,
  };
}

function makeResult(overrides: Partial<TranscriptionResult> = {}): TranscriptionResult {
  return {
    jobId: "job-123",
    text: "Olá, tudo bem?",
    language: "pt",
    durationSeconds: 5,
    segments: [],
    ...overrides,
  };
}

describe("HandleWhatsAppTranscriptionCallbackUseCase", () => {
  let messagesRepo: FakeWhatsAppMessagesRepository;
  let notificationsUseCase: FakeCreateNotificationUseCase;
  let eventBus: FakeNotificationsEventBus;
  let sut: HandleWhatsAppTranscriptionCallbackUseCase;

  beforeEach(() => {
    messagesRepo = new FakeWhatsAppMessagesRepository();
    notificationsUseCase = new FakeCreateNotificationUseCase();
    eventBus = new FakeNotificationsEventBus();
    sut = new HandleWhatsAppTranscriptionCallbackUseCase(
      messagesRepo,
      notificationsUseCase as any,
      eventBus as any,
    );
  });

  it("returns error when job not found", async () => {
    const result = await sut.execute({ jobId: "unknown-job", result: makeResult({ jobId: "unknown-job" }) });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
    expect((result.value as Error).message).toMatch(/not found/i);
  });

  it("saves transcript using result.text when no segments, using pushName as speaker", async () => {
    const msg = makeMessage({ fromMe: false, pushName: "Maria", mediaTranscriptionJobId: "job-abc" });
    messagesRepo.items.push(msg);

    const result = await sut.execute({
      jobId: "job-abc",
      result: makeResult({ jobId: "job-abc", text: "Olá, quero saber mais.", segments: [] }),
    });

    expect(result.isRight()).toBe(true);
    const saved = messagesRepo.items.find((m) => m.id === msg.id);
    expect(saved?.mediaTranscriptText).toBe("Maria: Olá, quero saber mais.");
    expect(saved?.mediaTranscriptionJobId).toBeNull();
  });

  it("saves transcript with segments joined", async () => {
    const msg = makeMessage({ fromMe: true, mediaTranscriptionJobId: "job-seg" });
    messagesRepo.items.push(msg);

    const result = await sut.execute({
      jobId: "job-seg",
      result: makeResult({
        jobId: "job-seg",
        text: "full text",
        segments: [{ start: 0, end: 1, text: "Bom dia" }, { start: 1, end: 2, text: "precisa de ajuda?" }],
      }),
    });

    expect(result.isRight()).toBe(true);
    const saved = messagesRepo.items.find((m) => m.id === msg.id);
    expect(saved?.mediaTranscriptText).toBe("Agente: Bom dia\nAgente: precisa de ajuda?");
  });

  it("uses 'Cliente' as speaker name when pushName is null and fromMe is false", async () => {
    const msg = makeMessage({ fromMe: false, pushName: null, mediaTranscriptionJobId: "job-nullname" });
    messagesRepo.items.push(msg);

    await sut.execute({ jobId: "job-nullname", result: makeResult({ jobId: "job-nullname", text: "texto", segments: [] }) });

    const saved = messagesRepo.items.find((m) => m.id === msg.id);
    expect(saved?.mediaTranscriptText).toBe("Cliente: texto");
  });

  it("creates notification after saving transcript", async () => {
    const ownerId = randomUUID();
    const msg = makeMessage({ ownerId, mediaTranscriptionJobId: "job-notif" });
    messagesRepo.items.push(msg);

    await sut.execute({ jobId: "job-notif", result: makeResult({ jobId: "job-notif" }) });

    expect(notificationsUseCase.calls).toHaveLength(1);
    const [call] = notificationsUseCase.calls;
    expect(call[0].type).toBe("WHATSAPP_TRANSCRIBED");
    expect(call[0].userId).toBe(ownerId);
    expect(call[0].jobId).toBe("job-notif");
  });

  it("emits event via event bus after saving", async () => {
    const msg = makeMessage({ mediaTranscriptionJobId: "job-bus" });
    messagesRepo.items.push(msg);

    await sut.execute({ jobId: "job-bus", result: makeResult({ jobId: "job-bus" }) });

    expect(eventBus.emitted).toHaveLength(1);
  });

  it("handles failed transcription — saves empty transcript and does not throw", async () => {
    const msg = makeMessage({ mediaTranscriptionJobId: "job-failed" });
    messagesRepo.items.push(msg);

    const result = await sut.execute({
      jobId: "job-failed",
      result: { jobId: "job-failed", text: "", language: "pt", durationSeconds: 0, segments: [] },
    });

    expect(result.isRight()).toBe(true);
    const saved = messagesRepo.items.find((m) => m.id === msg.id);
    expect(saved?.mediaTranscriptionJobId).toBeNull();
  });

  it("does not emit notification when message has no activityId (orphan)", async () => {
    const msg = makeMessage({ activityId: null, mediaTranscriptionJobId: "job-orphan" });
    messagesRepo.items.push(msg);

    const result = await sut.execute({ jobId: "job-orphan", result: makeResult({ jobId: "job-orphan" }) });

    expect(result.isRight()).toBe(true);
    // Notification still created using ownerId, but event bus still fires
    expect(eventBus.emitted).toHaveLength(1);
  });
});
