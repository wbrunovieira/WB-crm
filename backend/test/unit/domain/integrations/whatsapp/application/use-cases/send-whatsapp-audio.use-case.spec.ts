import { describe, it, expect, beforeEach } from "vitest";
import { SendWhatsAppAudioUseCase } from "@/domain/integrations/whatsapp/application/use-cases/send-whatsapp-audio.use-case";
import { FakeEvolutionApiPort } from "../../fakes/fake-evolution-api.port";
import { FakeGoogleDrivePort } from "../../fakes/fake-google-drive.port";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";

const audioBuffer = Buffer.from("fake-audio-data");
const baseInput = {
  to: "+5524999990000",
  buffer: audioBuffer,
  fileName: "audio.ogg",
  mimetype: "audio/ogg",
  requesterId: "owner-1",
  entityName: "Lead Teste",
};

describe("SendWhatsAppAudioUseCase", () => {
  let evolutionApi: FakeEvolutionApiPort;
  let drive: FakeGoogleDrivePort;
  let repo: FakeWhatsAppMessagesRepository;
  let transcriber: FakeTranscriberPort;
  let sut: SendWhatsAppAudioUseCase;

  beforeEach(() => {
    evolutionApi = new FakeEvolutionApiPort();
    drive = new FakeGoogleDrivePort();
    repo = new FakeWhatsAppMessagesRepository();
    transcriber = new FakeTranscriberPort();
    sut = new SendWhatsAppAudioUseCase(evolutionApi, drive, repo, transcriber);
  });

  it("envia áudio via Evolution API como PTT", async () => {
    const result = await sut.execute(baseInput);

    expect(result.isRight()).toBe(true);
    expect(evolutionApi.sentAudios).toHaveLength(1);
    expect(evolutionApi.sentAudios[0].to).toBe(baseInput.to);
  });

  it("salva arquivo no Google Drive antes de enviar", async () => {
    await sut.execute(baseInput);

    expect(drive.uploadedFiles).toHaveLength(1);
    const uploaded = drive.uploadedFiles[0];
    expect(uploaded.mimeType).toBe("audio/ogg");
    expect(uploaded.content).toEqual(audioBuffer);
  });

  it("cria registro WhatsApp message com fromMe=true e messageType=audioMessage", async () => {
    await sut.execute(baseInput);

    expect(repo.items).toHaveLength(1);
    const msg = repo.items[0];
    expect(msg.fromMe).toBe(true);
    expect(msg.messageType).toBe("audioMessage");
    expect(msg.ownerId).toBe("owner-1");
    expect(msg.mediaDriveId).toBeDefined();
    expect(msg.mediaUrl).toContain("drive.google.com");
  });

  it("submete áudio ao transcriber e salva jobId", async () => {
    transcriber.setNextJobId("job-audio-123");

    await sut.execute(baseInput);

    expect(transcriber.submittedJobs).toHaveLength(1);
    expect(transcriber.submittedJobs[0].type).toBe("audio");
    const msg = repo.items[0];
    expect(msg.mediaTranscriptionJobId).toBe("job-audio-123");
  });

  it("retorna messageId e driveId no resultado", async () => {
    evolutionApi.nextMessageId = "msg-audio-999";

    const result = await sut.execute(baseInput);

    expect(result.isRight()).toBe(true);
    const value = result.unwrap();
    expect(value.messageId).toBe("msg-audio-999");
    expect(value.driveId).toBeDefined();
  });

  it("falha se Evolution API lançar erro", async () => {
    evolutionApi.shouldFailAudio = true;

    const result = await sut.execute(baseInput);

    expect(result.isLeft()).toBe(true);
  });

  it("não falha se transcriber falhar (non-fatal)", async () => {
    transcriber.shouldFailSubmit = true;

    const result = await sut.execute(baseInput);

    expect(result.isRight()).toBe(true);
    // message still created, just without transcription job
    expect(repo.items).toHaveLength(1);
    expect(repo.items[0].mediaTranscriptionJobId).toBeUndefined();
  });

  it("salva mediaLabel indicando áudio de voz", async () => {
    await sut.execute(baseInput);

    expect(repo.items[0].mediaLabel).toContain("🎤");
  });

  it("associa activityId quando encontra sessão ativa", async () => {
    // Seed an existing session message
    repo.items.push({
      id: "existing-msg",
      messageId: "existing-waid",
      remoteJid: "+5524999990000@s.whatsapp.net",
      fromMe: true,
      messageType: "conversation",
      timestamp: new Date(Date.now() - 60_000), // 1 min ago
      ownerId: "owner-1",
      activityId: "act-123",
    } as any);

    await sut.execute(baseInput);

    expect(repo.items[repo.items.length - 1].activityId).toBe("act-123");
  });
});
