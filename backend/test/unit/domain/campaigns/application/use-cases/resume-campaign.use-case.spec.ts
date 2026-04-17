import { describe, it, expect, beforeEach } from "vitest";
import { ResumeCampaignUseCase } from "@/domain/campaigns/application/use-cases/resume-campaign.use-case";
import { InMemoryCampaignsRepository } from "../../repositories/in-memory-campaigns.repository";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";

describe("ResumeCampaignUseCase", () => {
  let campaigns: InMemoryCampaignsRepository;
  let sut: ResumeCampaignUseCase;

  beforeEach(() => {
    campaigns = new InMemoryCampaignsRepository();
    sut = new ResumeCampaignUseCase(campaigns);
  });

  it("retorna erro se campanha não está PAUSED", async () => {
    const campaign = Campaign.create({ ownerId: "o1", name: "C", instanceName: "i" });
    await campaigns.save(campaign);
    const result = await sut.execute({ campaignId: campaign.id.toString(), ownerId: "o1" });
    expect(result.isLeft()).toBe(true);
    expect((result as any).value.message).toContain("pausadas");
  });

  it("retoma campanha PAUSED → ACTIVE", async () => {
    const campaign = Campaign.create({ ownerId: "o1", name: "C", instanceName: "i" });
    campaign.start();   // DRAFT → ACTIVE
    campaign.pause();   // ACTIVE → PAUSED
    await campaigns.save(campaign);

    const result = await sut.execute({ campaignId: campaign.id.toString(), ownerId: "o1" });
    expect(result.isRight()).toBe(true);

    const saved = await campaigns.findById(campaign.id.toString());
    expect(saved?.status).toBe("ACTIVE");
  });
});
