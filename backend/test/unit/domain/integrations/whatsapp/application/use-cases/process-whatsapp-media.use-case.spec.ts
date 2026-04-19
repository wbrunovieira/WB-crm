import { describe, it, expect, beforeEach } from "vitest";
import { ProcessWhatsAppMediaUseCase } from "@/domain/integrations/whatsapp/application/use-cases/process-whatsapp-media.use-case";
import { FakeEvolutionApiPort } from "../../fakes/fake-evolution-api.port";
import { FakeGoogleDrivePort } from "../../fakes/fake-google-drive.port";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";

const WA_MSG_ID = "wa-msg-001";
const OWNER_ID = "owner-001";

function makeMediaInput(overrides: Partial<{
  whatsAppMessageId: string;
  messageType: string;
  entityName: string;
  senderName: string;
}> = {}) {
  return {
    whatsAppMessageId: overrides.whatsAppMessageId ?? WA_MSG_ID,
    messageData: {
      key: { id: "key-001", fromMe: false, remoteJid: "5511@s.whatsapp.net" },
      message: { audioMessage: { url: "https://example.com/audio" } },
      messageType: overrides.messageType ?? "audioMessage",
    },
    entityName: overrides.entityName ?? "Empresa XYZ",
    senderName: overrides.senderName ?? "João",
  };
}

let evolutionApi: FakeEvolutionApiPort;
let googleDrive: FakeGoogleDrivePort;
let whatsAppRepo: FakeWhatsAppMessagesRepository;
let transcriber: FakeTranscriberPort;
let useCase: ProcessWhatsAppMediaUseCase;

beforeEach(() => {
  evolutionApi = new FakeEvolutionApiPort();
  googleDrive = new FakeGoogleDrivePort();
  whatsAppRepo = new FakeWhatsAppMessagesRepository();
  transcriber = new FakeTranscriberPort();

  // Pre-insert a WhatsApp message to update
  whatsAppRepo.items.push({
    id: WA_MSG_ID,
    messageId: "evolution-msg-001",
    remoteJid: "5511@s.whatsapp.net",
    fromMe: false,
    messageType: "audioMessage",
    timestamp: new Date(),
    ownerId: OWNER_ID,
  });

  useCase = new ProcessWhatsAppMediaUseCase(evolutionApi, googleDrive, whatsAppRepo, transcriber);
});

describe("ProcessWhatsAppMediaUseCase", () => {
  it("downloads and uploads to Drive", async () => {
    const result = await useCase.execute(makeMediaInput());

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: true });

    expect(googleDrive.uploadedFiles).toHaveLength(1);
    expect(googleDrive.uploadedFiles[0].mimeType).toBe("audio/ogg");
  });

  it("saves driveId and mediaUrl after upload", async () => {
    await useCase.execute(makeMediaInput());

    const msg = whatsAppRepo.items[0];
    expect(msg.mediaDriveId).toBeDefined();
    expect(msg.mediaUrl).toContain("drive.google.com");
    expect(msg.mediaMimeType).toBe("audio/ogg");
  });

  it("submits transcription for audio", async () => {
    await useCase.execute(makeMediaInput({ messageType: "audioMessage" }));

    expect(transcriber.submittedJobs).toHaveLength(1);
    expect(transcriber.submittedJobs[0].type).toBe("audio");
  });

  it("submits transcription for video", async () => {
    await useCase.execute(makeMediaInput({ messageType: "videoMessage" }));

    expect(transcriber.submittedJobs).toHaveLength(1);
    expect(transcriber.submittedJobs[0].type).toBe("video");
  });

  it("does NOT submit transcription for image", async () => {
    await useCase.execute(makeMediaInput({ messageType: "imageMessage" }));

    expect(transcriber.submittedJobs).toHaveLength(0);
  });

  it("does NOT submit transcription for document", async () => {
    await useCase.execute(makeMediaInput({ messageType: "documentMessage" }));

    expect(transcriber.submittedJobs).toHaveLength(0);
  });

  it("saves transcriptionJobId after submission", async () => {
    transcriber.setNextJobId("job-audio-001");
    await useCase.execute(makeMediaInput({ messageType: "audioMessage" }));

    const msg = whatsAppRepo.items[0];
    expect(msg.mediaTranscriptionJobId).toBe("job-audio-001");
  });

  it("returns skipped=true when download fails (never throws)", async () => {
    evolutionApi.shouldFailDownload = true;

    const result = await useCase.execute(makeMediaInput());

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ skipped: true });
    expect(googleDrive.uploadedFiles).toHaveLength(0);
    expect(transcriber.submittedJobs).toHaveLength(0);
  });
});
