import { describe, it, expect, beforeEach } from "vitest";
import { CreateCampaignUseCase } from "@/domain/campaigns/application/use-cases/create-campaign.use-case";
import { InMemoryCampaignsRepository } from "../../repositories/in-memory-campaigns.repository";

describe("CreateCampaignUseCase", () => {
  let repo: InMemoryCampaignsRepository;
  let sut: CreateCampaignUseCase;

  beforeEach(() => {
    repo = new InMemoryCampaignsRepository();
    sut = new CreateCampaignUseCase(repo);
  });

  it("cria uma campanha com status DRAFT", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      name: "Campanha Outbound",
      instanceName: "wb-principal",
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(1);
    expect(repo.items[0].status).toBe("DRAFT");
  });

  it("retorna erro se name estiver vazio", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      name: "",
      instanceName: "wb-principal",
    });

    expect(result.isLeft()).toBe(true);
  });

  it("retorna erro se instanceName estiver vazio", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      name: "Campanha X",
      instanceName: "",
    });

    expect(result.isLeft()).toBe(true);
  });

  it("salva a descrição opcional", async () => {
    await sut.execute({
      ownerId: "user-1",
      name: "Campanha X",
      instanceName: "wb-principal",
      description: "Descrição da campanha",
    });

    expect(repo.items[0].description).toBe("Descrição da campanha");
  });
});
