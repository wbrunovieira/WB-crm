import { describe, it, expect, beforeEach } from "vitest";
import { AddRecipientsUseCase } from "@/domain/campaigns/application/use-cases/add-recipients.use-case";
import { InMemoryCampaignsRepository } from "../../repositories/in-memory-campaigns.repository";
import { InMemoryCampaignSendsRepository } from "../../repositories/in-memory-campaign-sends.repository";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";

const makeOwner = () => "owner-1";
const makeCampaign = () => Campaign.create({ ownerId: makeOwner(), name: "C", instanceName: "i1" });

describe("AddRecipientsUseCase", () => {
  let campaigns: InMemoryCampaignsRepository;
  let sends: InMemoryCampaignSendsRepository;
  let sut: AddRecipientsUseCase;

  beforeEach(() => {
    campaigns = new InMemoryCampaignsRepository();
    sends = new InMemoryCampaignSendsRepository();
    sut = new AddRecipientsUseCase(campaigns, sends);
  });

  it("retorna erro se campanha não encontrada", async () => {
    const result = await sut.execute({ campaignId: "xxx", ownerId: "o1", recipients: [] });
    expect(result.isLeft()).toBe(true);
  });

  it("adiciona destinatários válidos e rejeita inválidos", async () => {
    const campaign = makeCampaign();
    await campaigns.save(campaign);

    const { added, invalid } = (await sut.execute({
      campaignId: campaign.id.toString(),
      ownerId: makeOwner(),
      recipients: [
        { phone: "11999999999" },       // válido → normalizado para 5511...
        { phone: "123" },               // inválido
        { phone: "5511888888888" },     // válido
      ],
    })).unwrap();

    expect(added).toBe(2);
    expect(invalid).toContain("123");
    expect(sends.items).toHaveLength(2);
  });

  it("retorna erro se campanha está FINISHED", async () => {
    const campaign = makeCampaign();
    campaign.finish();
    await campaigns.save(campaign);

    const result = await sut.execute({
      campaignId: campaign.id.toString(),
      ownerId: makeOwner(),
      recipients: [{ phone: "11999999999" }],
    });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("finalizada");
  });
});
