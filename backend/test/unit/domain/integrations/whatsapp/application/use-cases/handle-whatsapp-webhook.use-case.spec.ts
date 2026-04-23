import { describe, it, expect, beforeEach, vi } from "vitest";

const flushPromises = () => new Promise<void>(resolve => setTimeout(resolve, 0));
import { HandleWhatsAppWebhookUseCase } from "@/domain/integrations/whatsapp/application/use-cases/handle-whatsapp-webhook.use-case";
import { ProcessWhatsAppMessageUseCase } from "@/domain/integrations/whatsapp/application/use-cases/process-whatsapp-message.use-case";
import { ProcessWhatsAppMediaUseCase } from "@/domain/integrations/whatsapp/application/use-cases/process-whatsapp-media.use-case";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakePhoneMatcherService } from "../../fakes/fake-phone-matcher.service";
import { FakeEvolutionApiPort } from "../../fakes/fake-evolution-api.port";
import { FakeGoogleDrivePort } from "../../fakes/fake-google-drive.port";
import { FakeTranscriberPort } from "../../fakes/fake-transcriber.port";
import { right } from "@/core/either";

const OWNER_ID = "owner-001";
const PHONE = "5511999998888";
const JID = `${PHONE}@s.whatsapp.net`;

const fakePrisma = {
  notification: {
    create: vi.fn().mockResolvedValue({}),
  },
};

let whatsAppRepo: FakeWhatsAppMessagesRepository;
let activitiesRepo: FakeActivitiesRepository;
let phoneMatcher: FakePhoneMatcherService;
let evolutionApi: FakeEvolutionApiPort;
let googleDrive: FakeGoogleDrivePort;
let transcriber: FakeTranscriberPort;
let processMessage: ProcessWhatsAppMessageUseCase;
let processMedia: ProcessWhatsAppMediaUseCase;
let useCase: HandleWhatsAppWebhookUseCase;

beforeEach(() => {
  vi.clearAllMocks();
  whatsAppRepo = new FakeWhatsAppMessagesRepository();
  activitiesRepo = new FakeActivitiesRepository();
  phoneMatcher = new FakePhoneMatcherService();
  phoneMatcher.addMatch(PHONE, { entityType: "contact", contactId: "contact-001" });
  evolutionApi = new FakeEvolutionApiPort();
  googleDrive = new FakeGoogleDrivePort();
  transcriber = new FakeTranscriberPort();

  processMessage = new ProcessWhatsAppMessageUseCase(
    whatsAppRepo,
    activitiesRepo,
    phoneMatcher as never,
    fakePrisma as never,
  );

  processMedia = new ProcessWhatsAppMediaUseCase(
    evolutionApi,
    googleDrive,
    whatsAppRepo,
    transcriber,
  );

  useCase = new HandleWhatsAppWebhookUseCase(processMessage, processMedia);
});

describe("HandleWhatsAppWebhookUseCase", () => {
  it("ignores non-messages.upsert events", async () => {
    const result = await useCase.execute({
      event: "messages.update",
      remoteJid: JID,
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
    expect(activitiesRepo.items).toHaveLength(0);
  });

  it("ignores group JIDs (@g.us)", async () => {
    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: "120363000000000@g.us",
      messageId: "msg-001",
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
    expect(activitiesRepo.items).toHaveLength(0);
  });

  it("ignores missing remoteJid", async () => {
    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: "",
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
  });

  it("processes valid individual message", async () => {
    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-valid-001",
      fromMe: false,
      messageType: "conversation",
      pushName: "João",
      text: "Olá!",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: true });
    expect(activitiesRepo.items).toHaveLength(1);
    expect(whatsAppRepo.items).toHaveLength(1);
  });

  it("returns ignored=true on internal error (never 500)", async () => {
    const throwingProcessMessage = {
      execute: vi.fn().mockRejectedValue(new Error("DB crashed")),
    } as unknown as ProcessWhatsAppMessageUseCase;

    const throwingUseCase = new HandleWhatsAppWebhookUseCase(throwingProcessMessage, processMedia);

    const result = await throwingUseCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-crash",
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
  });

  it("uses conversation as fallback for unknown messageType", async () => {
    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-unknown-type",
      fromMe: false,
      messageType: "unknownFutureType",
      text: "test",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: true });
  });

  // --- Media processing tests ---

  it("triggers media processing for audioMessage", async () => {
    const rawMessage = { audioMessage: { url: "https://cdn.whatsapp.net/audio.ogg" } };

    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-audio-001",
      fromMe: false,
      messageType: "audioMessage",
      pushName: "João",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
      messageRaw: rawMessage,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: true });

    // Media processing is fire-and-forget — wait for async work to settle
    await flushPromises();
    expect(googleDrive.uploadedFiles[0].mimeType).toBe("audio/ogg");
    await flushPromises();
    expect(transcriber.submittedJobs[0].type).toBe("audio");
  });

  it("triggers media processing for imageMessage (Drive upload, no transcription)", async () => {
    const rawMessage = { imageMessage: { url: "https://cdn.whatsapp.net/img.jpg" } };

    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-img-001",
      fromMe: false,
      messageType: "imageMessage",
      pushName: "Maria",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
      messageRaw: rawMessage,
    });

    expect(result.isRight()).toBe(true);
    await flushPromises();
    expect(googleDrive.uploadedFiles).toHaveLength(1);
    expect(transcriber.submittedJobs).toHaveLength(0);
  });

  it("triggers media processing for documentMessage", async () => {
    const rawMessage = { documentMessage: { url: "https://cdn.whatsapp.net/doc.pdf", fileName: "proposta.pdf" } };

    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-doc-001",
      fromMe: false,
      messageType: "documentMessage",
      pushName: "Carlos",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
      messageRaw: rawMessage,
    });

    expect(result.isRight()).toBe(true);
    await flushPromises();
    expect(googleDrive.uploadedFiles).toHaveLength(1);
    expect(transcriber.submittedJobs).toHaveLength(0);
  });

  it("does NOT trigger media processing for text messages", async () => {
    await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-txt-001",
      fromMe: false,
      messageType: "conversation",
      text: "Olá",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
    });

    expect(googleDrive.uploadedFiles).toHaveLength(0);
    expect(transcriber.submittedJobs).toHaveLength(0);
  });

  it("media download failure does not fail the webhook — returns processed=true", async () => {
    evolutionApi.shouldFailDownload = true;
    const rawMessage = { audioMessage: { url: "https://cdn.whatsapp.net/audio.ogg" } };

    const result = await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-audio-fail",
      fromMe: false,
      messageType: "audioMessage",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
      messageRaw: rawMessage,
    });

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ processed: true });
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("uses pushName as entityName for Drive folder", async () => {
    const rawMessage = { imageMessage: {} };

    await useCase.execute({
      event: "messages.upsert",
      remoteJid: JID,
      messageId: "msg-img-002",
      fromMe: false,
      messageType: "imageMessage",
      pushName: "Empresa XYZ",
      messageTimestamp: Math.floor(Date.now() / 1000),
      ownerId: OWNER_ID,
      messageRaw: rawMessage,
    });

    await flushPromises();
    const folderKey = Array.from(googleDrive.folders.keys())[0];
    expect(folderKey).toContain("Empresa XYZ");
  });
});
