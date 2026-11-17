import { describe, it, expect, beforeEach } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { EmailCampaign } from "@/domain/email-campaigns/enterprise/entities/email-campaign.entity";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import {
  ListEmailCampaignsUseCase,
  DeleteEmailCampaignUseCase,
  StartEmailCampaignUseCase,
  PauseEmailCampaignUseCase,
  ActivateCampaignForSendNowUseCase,
  CampaignNotFoundError,
  NotCampaignOwnerError,
} from "@/domain/email-campaigns/application/use-cases/email-campaign-lifecycle.use-cases";

const OWNER = "owner-1";
function campaign(id: string, status: "DRAFT" | "ACTIVE" | "PAUSED" | "FINISHED", ownerId = OWNER) {
  return EmailCampaign.create({ name: `C ${id}`, fromEmail: "f@x.com", status, ownerId }, new UniqueEntityID(id));
}

describe("Email campaign lifecycle use cases", () => {
  let repo: InMemoryEmailCampaignsRepository;
  beforeEach(() => { repo = new InMemoryEmailCampaignsRepository(); });

  it("List retorna só as campanhas do owner", async () => {
    repo.items.push(campaign("a", "DRAFT"), campaign("b", "DRAFT", "outro"));
    const sut = new ListEmailCampaignsUseCase(repo);
    const result = await sut.execute(OWNER);
    expect(result).toHaveLength(1);
    expect(result[0].id.toString()).toBe("a");
  });

  it("Delete remove a campanha", async () => {
    repo.items.push(campaign("a", "DRAFT"));
    await new DeleteEmailCampaignUseCase(repo).execute("a", OWNER);
    expect(repo.items).toHaveLength(0);
  });

  it("Start: DRAFT → ACTIVE", async () => {
    repo.items.push(campaign("a", "DRAFT"));
    const r = await new StartEmailCampaignUseCase(repo).execute("a", OWNER);
    expect(r.isRight()).toBe(true);
    if (r.isRight()) expect(r.value.status).toBe("ACTIVE");
  });

  it("Start: campanha inexistente → CampaignNotFoundError", async () => {
    const r = await new StartEmailCampaignUseCase(repo).execute("nope", OWNER);
    if (r.isLeft()) expect(r.value).toBeInstanceOf(CampaignNotFoundError);
    else throw new Error("esperava left");
  });

  it("Pause: ACTIVE → PAUSED", async () => {
    repo.items.push(campaign("a", "ACTIVE"));
    const r = await new PauseEmailCampaignUseCase(repo).execute("a", OWNER);
    if (r.isRight()) expect(r.value.status).toBe("PAUSED");
    else throw new Error("esperava right");
  });

  it("Pause: campanha inexistente → CampaignNotFoundError", async () => {
    const r = await new PauseEmailCampaignUseCase(repo).execute("nope", OWNER);
    if (r.isLeft()) expect(r.value).toBeInstanceOf(CampaignNotFoundError);
    else throw new Error("esperava left");
  });

  it("ActivateForSendNow: DRAFT é ativada", async () => {
    repo.items.push(campaign("a", "DRAFT"));
    const r = await new ActivateCampaignForSendNowUseCase(repo).execute("a", OWNER);
    expect(r.isRight()).toBe(true);
    expect((await repo.findById("a"))!.status).toBe("ACTIVE");
  });

  it("ActivateForSendNow: ACTIVE permanece ACTIVE (sem efeito)", async () => {
    repo.items.push(campaign("a", "ACTIVE"));
    const r = await new ActivateCampaignForSendNowUseCase(repo).execute("a", OWNER);
    expect(r.isRight()).toBe(true);
    expect((await repo.findById("a"))!.status).toBe("ACTIVE");
  });

  it("ActivateForSendNow: inexistente → CampaignNotFoundError", async () => {
    const r = await new ActivateCampaignForSendNowUseCase(repo).execute("nope", OWNER);
    if (r.isLeft()) expect(r.value).toBeInstanceOf(CampaignNotFoundError);
    else throw new Error("esperava left");
  });

  it("Start: não-dono → NotCampaignOwnerError (sem ativar)", async () => {
    repo.items.push(campaign("a", "DRAFT", OWNER));
    const r = await new StartEmailCampaignUseCase(repo).execute("a", "intruso");
    if (r.isLeft()) expect(r.value).toBeInstanceOf(NotCampaignOwnerError);
    else throw new Error("esperava left");
    expect((await repo.findById("a"))!.status).toBe("DRAFT");
  });

  it("Delete: não-dono → NotCampaignOwnerError (não remove)", async () => {
    repo.items.push(campaign("a", "DRAFT", OWNER));
    const r = await new DeleteEmailCampaignUseCase(repo).execute("a", "intruso");
    if (r.isLeft()) expect(r.value).toBeInstanceOf(NotCampaignOwnerError);
    else throw new Error("esperava left");
    expect(repo.items).toHaveLength(1);
  });

  it("Pause: não-dono → NotCampaignOwnerError", async () => {
    repo.items.push(campaign("a", "ACTIVE", OWNER));
    const r = await new PauseEmailCampaignUseCase(repo).execute("a", "intruso");
    if (r.isLeft()) expect(r.value).toBeInstanceOf(NotCampaignOwnerError);
    else throw new Error("esperava left");
  });

});
