import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProcessWhatsAppMessageUseCase } from "@/domain/integrations/whatsapp/application/use-cases/process-whatsapp-message.use-case";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";
import { FakePhoneMatcherService } from "../../fakes/fake-phone-matcher.service";

const OWNER_ID = "owner-001";
const PHONE = "5511999998888";
const JID = `${PHONE}@s.whatsapp.net`;
const BASE_TIMESTAMP = Math.floor(Date.now() / 1000);

function makeInput(overrides: Partial<Parameters<ProcessWhatsAppMessageUseCase["execute"]>[0]> = {}) {
  return {
    messageId: "msg-001",
    remoteJid: JID,
    fromMe: false,
    messageType: "conversation",
    pushName: "João",
    text: "Olá!",
    messageTimestamp: BASE_TIMESTAMP,
    ownerId: OWNER_ID,
    ...overrides,
  };
}

let whatsAppRepo: FakeWhatsAppMessagesRepository;
let activitiesRepo: FakeActivitiesRepository;
let phoneMatcher: FakePhoneMatcherService;
let useCase: ProcessWhatsAppMessageUseCase;
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

  useCase = new ProcessWhatsAppMessageUseCase(
    whatsAppRepo,
    activitiesRepo,
    phoneMatcher as never,
    fakePrisma as never,
  );
});

describe("ProcessWhatsAppMessageUseCase", () => {
  it("returns alreadyExists=true for duplicate messageId", async () => {
    // Pre-insert a message with the same messageId
    await whatsAppRepo.create({
      messageId: "msg-001",
      remoteJid: JID,
      fromMe: false,
      messageType: "conversation",
      timestamp: new Date(),
      ownerId: OWNER_ID,
    });

    const result = await useCase.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ alreadyExists: true });
    expect(activitiesRepo.items).toHaveLength(0);
  });

  it("returns ignored=true when phone not matched", async () => {
    // No match configured for this phone
    const result = await useCase.execute(makeInput({ remoteJid: "99999999999@s.whatsapp.net" }));

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ ignored: true });
    expect(activitiesRepo.items).toHaveLength(0);
  });

  it("creates new activity + notification on first message from contact", async () => {
    const result = await useCase.execute(makeInput());

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ isNewSession: true });
    expect(result.value.activityId).toBeDefined();

    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.type).toBe("whatsapp");
    expect(activity.subject).toContain("WhatsApp");
    expect(activity.completed).toBe(true);

    expect(whatsAppRepo.items).toHaveLength(1);
    expect(whatsAppRepo.items[0].messageId).toBe("msg-001");

    expect(fakePrisma.notification.create).toHaveBeenCalledOnce();
  });

  it("appends to existing activity when within 2h session window", async () => {
    // First message — creates activity
    const first = await useCase.execute(makeInput({ messageId: "msg-001" }));
    expect(first.value).toMatchObject({ isNewSession: true });

    // Second message within 2h
    const second = await useCase.execute(makeInput({
      messageId: "msg-002",
      text: "Segunda mensagem",
    }));

    expect(second.isRight()).toBe(true);
    expect(second.value).toMatchObject({ isNewSession: false });
    expect(second.value.activityId).toBe(first.value.activityId);

    // Still only 1 activity
    expect(activitiesRepo.items).toHaveLength(1);

    // Description should contain both messages
    const activity = activitiesRepo.items[0];
    expect(activity.description).toContain("Olá!");
    expect(activity.description).toContain("Segunda mensagem");

    // Notification only created once (for new session)
    expect(fakePrisma.notification.create).toHaveBeenCalledOnce();
  });

  it("creates new session when outside 2h window", async () => {
    // Manually insert a message with a timestamp > 2h ago
    const oldTimestamp = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3h ago
    await whatsAppRepo.create({
      messageId: "msg-old",
      remoteJid: JID,
      fromMe: false,
      messageType: "conversation",
      text: "Mensagem antiga",
      timestamp: oldTimestamp,
      activityId: "old-activity-id",
      ownerId: OWNER_ID,
    });

    // New message — should start a new session since old one is > 2h
    const result = await useCase.execute(makeInput({ messageId: "msg-new" }));

    expect(result.isRight()).toBe(true);
    expect(result.value).toMatchObject({ isNewSession: true });
    expect(result.value.activityId).not.toBe("old-activity-id");

    // A new activity should be created
    expect(activitiesRepo.items).toHaveLength(1);
  });

  it("sets contactId when phone matches contact", async () => {
    phoneMatcher.addMatch(PHONE, { entityType: "contact", contactId: "contact-abc" });

    const result = await useCase.execute(makeInput());
    expect(result.isRight()).toBe(true);

    const activity = activitiesRepo.items[0];
    expect(activity.contactId).toBe("contact-abc");
    expect(activity.leadId).toBeUndefined();
  });

  it("sets leadId when phone matches lead", async () => {
    phoneMatcher.addMatch(PHONE, { entityType: "lead", leadId: "lead-xyz" });

    const result = await useCase.execute(makeInput());
    expect(result.isRight()).toBe(true);

    const activity = activitiesRepo.items[0];
    expect(activity.leadId).toBe("lead-xyz");
    expect(activity.contactId).toBeUndefined();
  });

  it("formats message line with sender name from pushName", async () => {
    await useCase.execute(makeInput({ pushName: "Maria", text: "Oi!" }));

    const activity = activitiesRepo.items[0];
    expect(activity.description).toContain("Maria: Oi!");
  });

  it("formats message line with 'Você' for fromMe=true", async () => {
    await useCase.execute(makeInput({ fromMe: true, text: "Bom dia!" }));

    const activity = activitiesRepo.items[0];
    expect(activity.description).toContain("Você: Bom dia!");
  });
});
