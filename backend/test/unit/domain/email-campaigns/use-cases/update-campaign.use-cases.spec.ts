import { describe, it, expect, beforeEach } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { EmailCampaign } from "@/domain/email-campaigns/enterprise/entities/email-campaign.entity";
import { EmailCampaignStep } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step.entity";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignStepsRepository } from "../fakes/in-memory-email-campaign-steps.repository";
import {
  UpdateEmailCampaignUseCase,
  UpdateCampaignStepUseCase,
  GetCampaignStepsUseCase,
  CampaignNotFoundError,
  CampaignStepNotFoundError,
  CampaignAccessDeniedError,
} from "@/domain/email-campaigns/application/use-cases/update-campaign.use-cases";

const OWNER = "owner-1";

function makeCampaign(id = "camp-1", ownerId = OWNER) {
  return EmailCampaign.create(
    { name: "Antiga", fromEmail: "f@x.com", status: "DRAFT", ownerId },
    new UniqueEntityID(id),
  );
}
function makeStep(id = "step-1", campaignId = "camp-1", order = 0) {
  return EmailCampaignStep.create(
    { campaignId, order, subject: "Antigo", bodyHtml: "<p>old</p>", delayDays: 0 },
    new UniqueEntityID(id),
  );
}

let campaigns: InMemoryEmailCampaignsRepository;
let steps: InMemoryEmailCampaignStepsRepository;

beforeEach(() => {
  campaigns = new InMemoryEmailCampaignsRepository();
  steps = new InMemoryEmailCampaignStepsRepository();
});

describe("UpdateEmailCampaignUseCase", () => {
  it("updates name/description/fromEmail for the owner", async () => {
    campaigns.items.push(makeCampaign());
    const r = await new UpdateEmailCampaignUseCase(campaigns).execute({
      campaignId: "camp-1", ownerId: OWNER, name: "Novo nome", description: "desc",
    });
    expect(r.isRight()).toBe(true);
    expect(campaigns.items[0].name).toBe("Novo nome");
    expect(campaigns.items[0].description).toBe("desc");
  });

  it("denies a non-owner", async () => {
    campaigns.items.push(makeCampaign());
    const r = await new UpdateEmailCampaignUseCase(campaigns).execute({ campaignId: "camp-1", ownerId: "outro", name: "x" });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(CampaignAccessDeniedError);
    expect(campaigns.items[0].name).toBe("Antiga");
  });

  it("returns NotFound when the campaign does not exist", async () => {
    const r = await new UpdateEmailCampaignUseCase(campaigns).execute({ campaignId: "nope", ownerId: OWNER, name: "x" });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(CampaignNotFoundError);
  });
});

describe("UpdateCampaignStepUseCase", () => {
  it("updates subject and bodyHtml of the step (owner)", async () => {
    campaigns.items.push(makeCampaign());
    steps.items.push(makeStep());
    const r = await new UpdateCampaignStepUseCase(steps, campaigns).execute({
      stepId: "step-1", ownerId: OWNER, subject: "Novo assunto", bodyHtml: "<p>new</p>", delayDays: 2,
    });
    expect(r.isRight()).toBe(true);
    expect(steps.items[0].subject).toBe("Novo assunto");
    expect(steps.items[0].bodyHtml).toBe("<p>new</p>");
    expect(steps.items[0].delayDays).toBe(2);
  });

  it("denies when requester does not own the step's campaign", async () => {
    campaigns.items.push(makeCampaign("camp-1", "outro"));
    steps.items.push(makeStep());
    const r = await new UpdateCampaignStepUseCase(steps, campaigns).execute({ stepId: "step-1", ownerId: OWNER, subject: "x" });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(CampaignAccessDeniedError);
    expect(steps.items[0].subject).toBe("Antigo");
  });

  it("returns NotFound when the step does not exist", async () => {
    const r = await new UpdateCampaignStepUseCase(steps, campaigns).execute({ stepId: "nope", ownerId: OWNER, subject: "x" });
    expect(r.isLeft()).toBe(true);
    expect(r.value).toBeInstanceOf(CampaignStepNotFoundError);
  });
});

describe("GetCampaignStepsUseCase", () => {
  it("returns the campaign steps ordered by 'order'", async () => {
    steps.items.push(makeStep("s2", "camp-1", 1));
    steps.items.push(makeStep("s1", "camp-1", 0));
    const r = await new GetCampaignStepsUseCase(steps).execute("camp-1");
    expect(r).toHaveLength(2);
    expect(r[0].id.toString()).toBe("s1");
  });
});
