import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandleWhatsAppWebhookUseCase } from "@/domain/integrations/whatsapp/application/use-cases/handle-whatsapp-webhook.use-case";
import { ProcessWhatsAppMessageUseCase } from "@/domain/integrations/whatsapp/application/use-cases/process-whatsapp-message.use-case";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakePhoneMatcherService } from "../../fakes/fake-phone-matcher.service";
import { right } from "@/core/either";

const OWNER_ID = "owner-001";
const PHONE = "5511999998888";
const JID = `${PHONE}@s.whatsapp.net`;

let whatsAppRepo: FakeWhatsAppMessagesRepository;
let activitiesRepo: FakeActivitiesRepository;
let phoneMatcher: FakePhoneMatcherService;
let processMessage: ProcessWhatsAppMessageUseCase;
let useCase: HandleWhatsAppWebhookUseCase;

const fakePrisma = {
  notification: {
    create: vi.fn().mockResolvedValue({}),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  whatsAppRepo = new FakeWhatsAppMessagesRepository();
  activitiesRepo = new FakeActivitiesRepository();
  phoneMatcher = new FakePhoneMatcherService();
  phoneMatcher.addMatch(PHONE, { entityType: "contact", contactId: "contact-001" });

  processMessage = new ProcessWhatsAppMessageUseCase(
    whatsAppRepo,
    activitiesRepo,
    phoneMatcher as never,
    fakePrisma as never,
  );
  useCase = new HandleWhatsAppWebhookUseCase(processMessage);
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
    // Force processMessage to throw
    const throwingProcessMessage = {
      execute: vi.fn().mockRejectedValue(new Error("DB crashed")),
    } as unknown as ProcessWhatsAppMessageUseCase;

    const throwingUseCase = new HandleWhatsAppWebhookUseCase(throwingProcessMessage);

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
});
