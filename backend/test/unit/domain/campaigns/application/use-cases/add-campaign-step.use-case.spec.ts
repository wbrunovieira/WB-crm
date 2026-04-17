import { describe, it, expect, beforeEach } from "vitest";
import { AddCampaignStepUseCase } from "@/domain/campaigns/application/use-cases/add-campaign-step.use-case";
import { InMemoryCampaignsRepository } from "../../repositories/in-memory-campaigns.repository";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";

describe("AddCampaignStepUseCase", () => {
  let campaigns: InMemoryCampaignsRepository;
  let sut: AddCampaignStepUseCase;

  beforeEach(() => {
    campaigns = new InMemoryCampaignsRepository();
    sut = new AddCampaignStepUseCase(campaigns);
  });

  it("adiciona step a campanha DRAFT", async () => {
    const campaign = Campaign.create({ ownerId: "o1", name: "C", instanceName: "i" });
    await campaigns.save(campaign);

    const result = await sut.execute({
      campaignId: campaign.id.toString(),
      ownerId: "o1",
      type: "TEXT",
      text: "Olá",
    });
    expect(result.isRight()).toBe(true);
    const { step } = (result as any).value;
    expect(step.type).toBe("TEXT");
    expect(step.order).toBe(0);

    const saved = await campaigns.findById(campaign.id.toString());
    expect(saved?.steps).toHaveLength(1);
  });

  it("retorna erro se campanha está ACTIVE", async () => {
    const campaign = Campaign.create({ ownerId: "o1", name: "C", instanceName: "i" });
    campaign.start();
    await campaigns.save(campaign);

    const result = await sut.execute({
      campaignId: campaign.id.toString(),
      ownerId: "o1",
      type: "TEXT",
      text: "Olá",
    });
    expect(result.isLeft()).toBe(true);
    expect((result as any).value.message).toContain("Pause");
  });

  it("incrementa order corretamente", async () => {
    const campaign = Campaign.create({ ownerId: "o1", name: "C", instanceName: "i" });
    await campaigns.save(campaign);

    await sut.execute({ campaignId: campaign.id.toString(), ownerId: "o1", type: "TEXT", text: "1" });
    const result = await sut.execute({ campaignId: campaign.id.toString(), ownerId: "o1", type: "DELAY", delaySeconds: 5 });

    expect((result as any).value.step.order).toBe(1);
  });
});
