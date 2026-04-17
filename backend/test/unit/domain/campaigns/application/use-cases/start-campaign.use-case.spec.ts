import { describe, it, expect, beforeEach } from "vitest";
import { StartCampaignUseCase } from "@/domain/campaigns/application/use-cases/start-campaign.use-case";
import { InMemoryCampaignsRepository } from "../../repositories/in-memory-campaigns.repository";
import { InMemoryCampaignSendsRepository } from "../../repositories/in-memory-campaign-sends.repository";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";
import { CampaignSend } from "@/domain/campaigns/enterprise/entities/campaign-send";

function makeCampaign(ownerId = "user-1") {
  return Campaign.create({ ownerId, name: "Campanha X", instanceName: "wb-principal" });
}

function makeSend(campaignId: string, phone = "5511999998888") {
  return CampaignSend.create({ campaignId, phone });
}

describe("StartCampaignUseCase", () => {
  let campaignsRepo: InMemoryCampaignsRepository;
  let sendsRepo: InMemoryCampaignSendsRepository;
  let sut: StartCampaignUseCase;

  beforeEach(() => {
    campaignsRepo = new InMemoryCampaignsRepository();
    sendsRepo = new InMemoryCampaignSendsRepository();
    sut = new StartCampaignUseCase(campaignsRepo, sendsRepo);
  });

  it("ativa campanha DRAFT com pelo menos um destinatário", async () => {
    const campaign = makeCampaign();
    await campaignsRepo.save(campaign);
    await sendsRepo.save(makeSend(campaign.id.toString()));

    const result = await sut.execute({ campaignId: campaign.id.toString(), ownerId: "user-1" });

    expect(result.isRight()).toBe(true);
    expect(campaignsRepo.items[0].status).toBe("ACTIVE");
  });

  it("retorna erro se campanha não encontrada", async () => {
    const result = await sut.execute({ campaignId: "nao-existe", ownerId: "user-1" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro se campanha não pertence ao usuário", async () => {
    const campaign = makeCampaign("user-outro");
    await campaignsRepo.save(campaign);
    await sendsRepo.save(makeSend(campaign.id.toString()));

    const result = await sut.execute({ campaignId: campaign.id.toString(), ownerId: "user-1" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro se não há destinatários", async () => {
    const campaign = makeCampaign();
    await campaignsRepo.save(campaign);

    const result = await sut.execute({ campaignId: campaign.id.toString(), ownerId: "user-1" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro se campanha já está ACTIVE", async () => {
    const campaign = makeCampaign();
    campaign.start();
    await campaignsRepo.save(campaign);
    await sendsRepo.save(makeSend(campaign.id.toString()));

    const result = await sut.execute({ campaignId: campaign.id.toString(), ownerId: "user-1" });
    expect(result.isLeft()).toBe(true);
  });
});
