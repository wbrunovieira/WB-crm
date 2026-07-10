import { describe, it, expect, beforeEach } from "vitest";
import { SendWhatsAppMediaUseCase } from "@/domain/integrations/whatsapp/application/use-cases/send-whatsapp-media.use-case";
import { FakeEvolutionApiPort } from "../../fakes/fake-evolution-api.port";
import { FakeWhatsAppMessagesRepository } from "../../fakes/fake-whatsapp-messages.repository";
import { FakeActivitiesRepository } from "../../fakes/fake-activities.repository";

const baseInput = {
  to: "+5524999990000",
  mediatype: "document",
  mediaBase64: "ZmFrZS1kb2M=",
  fileName: "proposta.pdf",
  mimetype: "application/pdf",
  ownerId: "owner-1",
  entityName: "Lead Teste",
};

describe("SendWhatsAppMediaUseCase", () => {
  let evolutionApi: FakeEvolutionApiPort;
  let repo: FakeWhatsAppMessagesRepository;
  let activitiesRepo: FakeActivitiesRepository;
  let sut: SendWhatsAppMediaUseCase;

  beforeEach(() => {
    evolutionApi = new FakeEvolutionApiPort();
    repo = new FakeWhatsAppMessagesRepository();
    activitiesRepo = new FakeActivitiesRepository();
    sut = new SendWhatsAppMediaUseCase(evolutionApi, repo, activitiesRepo);
  });

  it("envia mídia via Evolution API", async () => {
    const result = await sut.execute(baseInput);

    expect(result.isRight()).toBe(true);
    expect(evolutionApi.sentMedia).toHaveLength(1);
    expect(evolutionApi.sentMedia[0].opts.to).toBe(baseInput.to);
  });

  it("cria atividade whatsapp quando não há sessão ativa", async () => {
    await sut.execute(baseInput);

    expect(activitiesRepo.items).toHaveLength(1);
    const activity = activitiesRepo.items[0];
    expect(activity.type).toBe("whatsapp");
    expect(activity.completed).toBe(true);
    expect(activity.subject).toContain("Lead Teste");
    expect(activity.description).toContain("📎 proposta.pdf");
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
});
