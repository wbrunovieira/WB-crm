import { describe, it, expect, beforeEach } from "vitest";
import {
  UpsertStepTranslationUseCase,
  ListStepTranslationsUseCase,
  RemoveStepTranslationUseCase,
} from "@/domain/email-campaigns/application/use-cases/step-translations.use-cases";
import { EmailCampaignStep } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step.entity";
import { EmailCampaign } from "@/domain/email-campaigns/enterprise/entities/email-campaign.entity";
import { EmailCampaignStepTranslation } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step-translation.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

const OWNER = "user-1";

class FakeSteps {
  items = new Map<string, EmailCampaignStep>();
  seed(id: string, campaignId = "c1") {
    this.items.set(id, EmailCampaignStep.create({ campaignId, order: 0, subject: "PT", bodyHtml: "<p>PT</p>", delayDays: 0 }, new UniqueEntityID(id)));
  }
  async findById(id: string) { return this.items.get(id) ?? null; }
  async findByCampaign() { return []; }
  async save() {}
  async deleteByCampaign() {}
}

class FakeCampaigns {
  items = new Map<string, EmailCampaign>();
  seed(id: string, ownerId = OWNER) {
    this.items.set(id, EmailCampaign.create({ name: "C", description: undefined, fromEmail: "a@b.com", status: "DRAFT", ownerId }, new UniqueEntityID(id)));
  }
  async findById(id: string) { return this.items.get(id) ?? null; }
  async save() {}
}

class FakeTranslations {
  items: EmailCampaignStepTranslation[] = [];
  async findByStep(stepId: string) { return this.items.filter((t) => t.stepId === stepId); }
  async findByStepAndLanguage(stepId: string, language: string) {
    return this.items.find((t) => t.stepId === stepId && t.language === language) ?? null;
  }
  async upsert(t: EmailCampaignStepTranslation) {
    const i = this.items.findIndex((x) => x.stepId === t.stepId && x.language === t.language);
    if (i >= 0) this.items[i] = t; else this.items.push(t);
  }
  async delete(stepId: string, language: string) {
    this.items = this.items.filter((t) => !(t.stepId === stepId && t.language === language));
  }
}

let steps: FakeSteps, campaigns: FakeCampaigns, trans: FakeTranslations;
let upsert: UpsertStepTranslationUseCase, list: ListStepTranslationsUseCase, remove: RemoveStepTranslationUseCase;

beforeEach(() => {
  steps = new FakeSteps(); campaigns = new FakeCampaigns(); trans = new FakeTranslations();
  campaigns.seed("c1", OWNER);
  steps.seed("step-1", "c1");
  upsert = new UpsertStepTranslationUseCase(steps as never, campaigns as never, trans as never);
  list = new ListStepTranslationsUseCase(steps as never, campaigns as never, trans as never);
  remove = new RemoveStepTranslationUseCase(steps as never, campaigns as never, trans as never);
});

const base = { stepId: "step-1", ownerId: OWNER };

describe("UpsertStepTranslationUseCase", () => {
  it("cria uma tradução en", async () => {
    const r = await upsert.execute({ ...base, language: "en", subject: "EN", bodyHtml: "<p>EN</p>" });
    expect(r.isRight()).toBe(true);
    expect(trans.items).toHaveLength(1);
    expect(trans.items[0].language).toBe("en");
  });

  it("atualiza a tradução existente (não duplica)", async () => {
    await upsert.execute({ ...base, language: "en", subject: "EN v1", bodyHtml: "<p>1</p>" });
    await upsert.execute({ ...base, language: "en", subject: "EN v2", bodyHtml: "<p>2</p>" });
    expect(trans.items).toHaveLength(1);
    expect(trans.items[0].subject).toBe("EN v2");
  });

  it("rejeita idioma 'pt' (é o conteúdo base do step)", async () => {
    const r = await upsert.execute({ ...base, language: "pt", subject: "x", bodyHtml: "<p>x</p>" });
    expect(r.isLeft()).toBe(true);
  });

  it("rejeita idioma não suportado", async () => {
    const r = await upsert.execute({ ...base, language: "fr", subject: "x", bodyHtml: "<p>x</p>" });
    expect(r.isLeft()).toBe(true);
  });

  it("rejeita step inexistente", async () => {
    const r = await upsert.execute({ stepId: "nope", ownerId: OWNER, language: "en", subject: "x", bodyHtml: "<p>x</p>" });
    expect(r.isLeft()).toBe(true);
  });

  it("rejeita subject/body vazio", async () => {
    const r = await upsert.execute({ ...base, language: "en", subject: "  ", bodyHtml: "" });
    expect(r.isLeft()).toBe(true);
  });

  it("nega acesso quando a campanha é de outro dono", async () => {
    const r = await upsert.execute({ stepId: "step-1", ownerId: "outro-user", language: "en", subject: "EN", bodyHtml: "<p>EN</p>" });
    expect(r.isLeft()).toBe(true);
    expect(trans.items).toHaveLength(0);
  });
});

describe("List/Remove", () => {
  it("lista as traduções do step", async () => {
    await upsert.execute({ ...base, language: "en", subject: "EN", bodyHtml: "<p>EN</p>" });
    await upsert.execute({ ...base, language: "es", subject: "ES", bodyHtml: "<p>ES</p>" });
    const r = await list.execute(base);
    expect(r.isRight() && r.value.length).toBe(2);
  });

  it("list nega acesso p/ outro dono", async () => {
    const r = await list.execute({ stepId: "step-1", ownerId: "outro" });
    expect(r.isLeft()).toBe(true);
  });

  it("remove uma tradução", async () => {
    await upsert.execute({ ...base, language: "en", subject: "EN", bodyHtml: "<p>EN</p>" });
    await remove.execute({ ...base, language: "en" });
    expect(trans.items).toHaveLength(0);
  });

  it("remove nega acesso p/ outro dono", async () => {
    await upsert.execute({ ...base, language: "en", subject: "EN", bodyHtml: "<p>EN</p>" });
    const r = await remove.execute({ stepId: "step-1", ownerId: "outro", language: "en" });
    expect(r.isLeft()).toBe(true);
    expect(trans.items).toHaveLength(1); // não removeu
  });
});
