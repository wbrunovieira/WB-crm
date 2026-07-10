import { describe, it, expect, beforeEach } from "vitest";
import { SendWhatsAppAudioUseCase } from "@/domain/integrations/whatsapp/application/use-cases/send-whatsapp-audio.use-case";
import { FakeEvolutionApiPort } from "../../fakes/fake-evolution-api.port";
import { FakeGoogleDrivePort } from "../../fakes/fake-google-drive.port";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";

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
  let activitiesRepo: FakeActivitiesRepository;
  let sut: SendWhatsAppAudioUseCase;

  beforeEach(() => {
    evolutionApi = new FakeEvolutionApiPort();
    drive = new FakeGoogleDrivePort();
    repo = new FakeWhatsAppMessagesRepository();
    transcriber = new FakeTranscriberPort();
    activitiesRepo = new FakeActivitiesRepository();
    sut = new SendWhatsAppAudioUseCase(evolutionApi, drive, repo, transcriber, activitiesRepo);
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

  it("retorna messageId, driveId e activityId no resultado", async () => {
    evolutionApi.nextMessageId = "msg-audio-999";

    const result = await sut.execute(baseInput);

    expect(result.isRight()).toBe(true);
    const value = result.unwrap();
    expect(value.messageId).toBe("msg-audio-999");
    expect(value.driveId).toBeDefined();
    expect(value.activityId).toBeDefined();
  });

  it("cria atividade whatsapp quando não há sessão ativa", async () => {
    await sut.execute(baseInput);

    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.type).toBe("whatsapp");
    expect(activity.completed).toBe(true);
    expect(activity.subject).toContain("Lead Teste");
    expect(activity.description).toContain("🎤 Áudio de voz");
  });

  it("associa leadId e contactId à atividade criada", async () => {
    await sut.execute({ ...baseInput, leadId: "lead-1", contactId: "contact-1" });

    const activity = activitiesRepo.items[0];
    expect(activity.leadId).toBe("lead-1");
    expect(activity.contactId).toBe("contact-1");
  });

  it("associa partnerId à atividade criada", async () => {
    await sut.execute({ ...baseInput, partnerId: "partner-1" });

    const activity = activitiesRepo.items[0];
    expect(activity.partnerId).toBe("partner-1");
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
    expect(repo.items).toHaveLength(1);
    expect(repo.items[0].mediaTranscriptionJobId).toBeUndefined();
  });

  it("salva mediaLabel indicando áudio de voz", async () => {
    await sut.execute(baseInput);

    expect(repo.items[0].mediaLabel).toContain("🎤");
  });

  it("associa activityId quando encontra sessão ativa", async () => {
    repo.items.push({
      id: "existing-msg",
      messageId: "existing-waid",
      remoteJid: "+5524999990000@s.whatsapp.net",
      fromMe: true,
      messageType: "conversation",
      timestamp: new Date(Date.now() - 60_000),
      ownerId: "owner-1",
      activityId: "act-123",
    } as any);

    await sut.execute(baseInput);

    expect(repo.items[repo.items.length - 1].activityId).toBe("act-123");
  });

  it("não cria atividade nova quando há sessão ativa", async () => {
    const existingActivity = activitiesRepo.createAndAdd({
      ownerId: "owner-1",
      type: "whatsapp",
      subject: "WhatsApp — Lead Teste",
      description: "[10:00] Você: oi",
      completed: true,
      completedAt: new Date(),
      dueDate: new Date(),
      meetingNoShow: false,
      emailReplied: false,
      emailOpenCount: 0,
      emailLinkClickCount: 0,
    });
    repo.items.push({
      id: "existing-msg",
      messageId: "existing-waid",
      remoteJid: "+5524999990000@s.whatsapp.net",
      fromMe: true,
      messageType: "conversation",
      timestamp: new Date(Date.now() - 60_000),
      ownerId: "owner-1",
      activityId: existingActivity.id.toString(),
    } as any);

    await sut.execute(baseInput);

    // Still only 1 activity, description was appended
    expect(activitiesRepo.items).toHaveLength(1);
    expect(activitiesRepo.items[0].description).toContain("🎤 Áudio de voz");
  });
});
