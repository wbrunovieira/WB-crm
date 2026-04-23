import { describe, it, expect, beforeEach } from "vitest";
import { SendWhatsAppMessageUseCase } from "@/domain/integrations/whatsapp/application/use-cases/send-whatsapp-message.use-case";
import { FakeEvolutionApiPort } from "../../fakes/fake-evolution-api.port";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";

const OWNER_ID = "owner-001";
const PHONE = "5511999998888";

let evolutionApi: FakeEvolutionApiPort;
let whatsAppRepo: FakeWhatsAppMessagesRepository;
let activitiesRepo: FakeActivitiesRepository;
let useCase: SendWhatsAppMessageUseCase;

beforeEach(() => {
  evolutionApi = new FakeEvolutionApiPort();
  whatsAppRepo = new FakeWhatsAppMessagesRepository();
  activitiesRepo = new FakeActivitiesRepository();
  useCase = new SendWhatsAppMessageUseCase(evolutionApi, whatsAppRepo, activitiesRepo);
});

describe("SendWhatsAppMessageUseCase", () => {
  it("sends message and creates activity", async () => {
    const result = await useCase.execute({
      to: PHONE,
      text: "Olá, tudo bem?",
      ownerId: OWNER_ID,
      contactName: "Maria",
    });

    expect(result.isRight()).toBe(true);
    const { messageId, activityId } = result.unwrap();
    expect(messageId).toBeDefined();
    expect(activityId).toBeDefined();

    // Check activity was created
    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.type).toBe("whatsapp");
    expect(activity.ownerId).toBe(OWNER_ID);
    expect(activity.completed).toBe(true);
    expect(activity.description).toContain("Você: Olá, tudo bem?");

    // Check WhatsApp message record was created
    expect(whatsAppRepo.items).toHaveLength(1);
    expect(whatsAppRepo.items[0].fromMe).toBe(true);
    expect(whatsAppRepo.items[0].text).toBe("Olá, tudo bem?");
  });

  it("returns messageId on success", async () => {
    evolutionApi.nextMessageId = "evo-msg-xyz";

    const result = await useCase.execute({
      to: PHONE,
      text: "Teste",
      ownerId: OWNER_ID,
    });

    expect(result.isRight()).toBe(true);
    expect(result.unwrap().messageId).toBe("evo-msg-xyz");
  });

  it("returns left(error) when sendText fails", async () => {
    evolutionApi.shouldFailSend = true;

    const result = await useCase.execute({
      to: PHONE,
      text: "Vai falhar",
      ownerId: OWNER_ID,
    });

    expect(result.isLeft()).toBe(true);
    // No activity or message should be created
    expect(activitiesRepo.items).toHaveLength(0);
    expect(whatsAppRepo.items).toHaveLength(0);
  });

  it("uses contact name in subject when provided", async () => {
    await useCase.execute({
      to: PHONE,
      text: "Olá",
      ownerId: OWNER_ID,
      contactName: "Dr. Carlos",
    });

    const activity = activitiesRepo.items[0];
    expect(activity.subject).toContain("Dr. Carlos");
  });

  it("uses phone number in subject when contactName is not provided", async () => {
    await useCase.execute({
      to: PHONE,
      text: "Olá",
      ownerId: OWNER_ID,
    });

    const activity = activitiesRepo.items[0];
    expect(activity.subject).toContain(PHONE);
  });

  it("links activity to leadId when provided", async () => {
    await useCase.execute({
      to: PHONE,
      text: "Olá lead",
      ownerId: OWNER_ID,
      contactName: "Lead Teste",
      leadId: "lead-abc",
    });

    const activity = activitiesRepo.items[0];
    expect(activity.leadId).toBe("lead-abc");
    expect(activity.contactId).toBeNull();
  });

  it("links activity to contactId when provided", async () => {
    await useCase.execute({
      to: PHONE,
      text: "Olá contato",
      ownerId: OWNER_ID,
      contactName: "Contato Teste",
      contactId: "contact-xyz",
    });

    const activity = activitiesRepo.items[0];
    expect(activity.contactId).toBe("contact-xyz");
    expect(activity.leadId).toBeNull();
  });
});
