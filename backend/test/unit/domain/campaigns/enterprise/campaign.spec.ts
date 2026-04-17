import { describe, it, expect } from "vitest";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";
import { CampaignStep } from "@/domain/campaigns/enterprise/entities/campaign-step";

function makeCampaign(overrides = {}) {
  return Campaign.create({
    ownerId: "user-1",
    name: "Campanha Teste",
    instanceName: "wb-principal",
    ...overrides,
  });
}

describe("Campaign entity", () => {
  it("cria campanha com status DRAFT por padrão", () => {
    const campaign = makeCampaign();
    expect(campaign.status).toBe("DRAFT");
  });

  it("start() muda status para ACTIVE", () => {
    const campaign = makeCampaign();
    campaign.start();
    expect(campaign.status).toBe("ACTIVE");
  });

  it("pause() só funciona em campanha ACTIVE", () => {
    const campaign = makeCampaign();
    campaign.start();
    campaign.pause();
    expect(campaign.status).toBe("PAUSED");
  });

  it("pause() em campanha DRAFT não muda status", () => {
    const campaign = makeCampaign();
    campaign.pause();
    expect(campaign.status).toBe("DRAFT");
  });

  it("resume() restaura PAUSED para ACTIVE", () => {
    const campaign = makeCampaign();
    campaign.start();
    campaign.pause();
    campaign.resume();
    expect(campaign.status).toBe("ACTIVE");
  });

  it("finish() muda status para FINISHED", () => {
    const campaign = makeCampaign();
    campaign.start();
    campaign.finish();
    expect(campaign.status).toBe("FINISHED");
  });

  it("addStep adiciona step à campanha", () => {
    const campaign = makeCampaign();
    const step = CampaignStep.create({ campaignId: campaign.id.toString(), order: 0, type: "TEXT", text: "Olá!" });
    campaign.addStep(step);
    expect(campaign.steps).toHaveLength(1);
  });

  it("emite evento CampaignStartedEvent ao chamar start()", () => {
    const campaign = makeCampaign();
    campaign.start();
    expect(campaign.domainEvents.some(e => e.constructor.name === "CampaignStartedEvent")).toBe(true);
  });
});
