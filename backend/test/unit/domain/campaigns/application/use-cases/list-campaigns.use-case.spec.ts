import { describe, it, expect, beforeEach } from "vitest";
import { ListCampaignsUseCase } from "@/domain/campaigns/application/use-cases/list-campaigns.use-case";
import { InMemoryCampaignsRepository } from "../../repositories/in-memory-campaigns.repository";
import { Campaign } from "@/domain/campaigns/enterprise/entities/campaign";

describe("ListCampaignsUseCase", () => {
  let campaigns: InMemoryCampaignsRepository;
  let sut: ListCampaignsUseCase;

  beforeEach(() => {
    campaigns = new InMemoryCampaignsRepository();
    sut = new ListCampaignsUseCase(campaigns);
  });

  it("retorna lista vazia quando não há campanhas", async () => {
    const result = await sut.execute({ ownerId: "owner-1" });
    expect(result.isRight()).toBe(true);
    expect((result as any).value.campaigns).toHaveLength(0);
  });

  it("retorna apenas campanhas do owner", async () => {
    await campaigns.save(Campaign.create({ ownerId: "owner-1", name: "C1", instanceName: "i1" }));
    await campaigns.save(Campaign.create({ ownerId: "owner-2", name: "C2", instanceName: "i2" }));

    const result = await sut.execute({ ownerId: "owner-1" });
    expect(result.isRight()).toBe(true);
    const list = (result as any).value.campaigns;
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("C1");
  });
});
