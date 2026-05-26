import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetCampaignProgressUseCase } from "@/domain/email-campaigns/application/use-cases/get-campaign-progress.use-case";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignStepsRepository } from "../fakes/in-memory-email-campaign-steps.repository";
import { InMemoryEmailCampaignRecipientsRepository } from "../fakes/in-memory-email-campaign-recipients.repository";
import { InMemoryEmailCampaignSendsRepository } from "../fakes/in-memory-email-campaign-sends.repository";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";
import { EmailCampaignStep } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step.entity";
import { EmailCampaignRecipient } from "@/domain/email-campaigns/enterprise/entities/email-campaign-recipient.entity";
import { EmailCampaignSend } from "@/domain/email-campaigns/enterprise/entities/email-campaign-send.entity";

const OWNER = "owner-1";
const FROM = "bruno@wbdigitalsolutions.com";

function makePrismaStub(stepRows: { id: string; order: number }[]) {
  return {
    emailCampaignStep: {
      findMany: vi.fn().mockResolvedValue(stepRows),
    },
  } as any;
}

describe("GetCampaignProgressUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let steps: InMemoryEmailCampaignStepsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let sends: InMemoryEmailCampaignSendsRepository;
  let campaignId: string;

  beforeEach(async () => {
    campaigns = new InMemoryEmailCampaignsRepository();
    steps = new InMemoryEmailCampaignStepsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    sends = new InMemoryEmailCampaignSendsRepository();

    const created = await new CreateEmailCampaignUseCase(campaigns).execute({
      name: "Progress Test", fromEmail: FROM, ownerId: OWNER,
    });
    campaignId = (created.value as { id: string }).id;
  });

  it("should return campaign not found for unknown id", async () => {
    const sut = new GetCampaignProgressUseCase(
      campaigns, recipients, sends, steps, makePrismaStub([]),
    );
    const result = await sut.execute({ campaignId: "non-existent" });
    expect(result.isLeft()).toBe(true);
  });

  it("should return totalSteps and empty recipients when no one enrolled", async () => {
    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    await steps.save(step);

    const sut = new GetCampaignProgressUseCase(
      campaigns, recipients, sends, steps,
      makePrismaStub([{ id: step.id.toString(), order: 0 }]),
    );

    const result = await sut.execute({ campaignId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.totalSteps).toBe(1);
      expect(result.value.totalRecipients).toBe(0);
      expect(result.value.recipients).toHaveLength(0);
    }
  });

  it("should return correct stepsSent per recipient", async () => {
    const step0 = EmailCampaignStep.create({ campaignId, order: 0, subject: "S0", bodyHtml: "B0", delayDays: 0 });
    const step1 = EmailCampaignStep.create({ campaignId, order: 1, subject: "S1", bodyHtml: "B1", delayDays: 3 });
    await steps.save(step0);
    await steps.save(step1);

    const r = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com", name: "Alice",
    });
    await recipients.save(r);

    const send = EmailCampaignSend.create({ recipientId: r.id.toString(), stepId: step0.id.toString() });
    await sends.save(send);

    const sut = new GetCampaignProgressUseCase(
      campaigns, recipients, sends, steps,
      makePrismaStub([
        { id: step0.id.toString(), order: 0 },
        { id: step1.id.toString(), order: 1 },
      ]),
    );

    const result = await sut.execute({ campaignId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const alice = result.value.recipients[0];
      expect(alice.stepsSent).toEqual([0]);
      expect(alice.openedAt).toBeUndefined();
      expect(alice.clickedAt).toBeUndefined();
      expect(alice.clickedUrl).toBeUndefined();
    }
  });

  it("should return openedAt and clickedAt when send is tracked", async () => {
    const step = EmailCampaignStep.create({ campaignId, order: 0, subject: "S", bodyHtml: "B", delayDays: 0 });
    await steps.save(step);

    const r = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com", name: "Alice",
    });
    await recipients.save(r);

    const send = EmailCampaignSend.create({ recipientId: r.id.toString(), stepId: step.id.toString() });
    send.markOpened();
    send.markClicked("https://wbdigitalsolutions.com/lp");
    await sends.save(send);

    const sut = new GetCampaignProgressUseCase(
      campaigns, recipients, sends, steps,
      makePrismaStub([{ id: step.id.toString(), order: 0 }]),
    );

    const result = await sut.execute({ campaignId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      const alice = result.value.recipients[0];
      expect(alice.openedAt).toBeDefined();
      expect(alice.clickedAt).toBeDefined();
      expect(alice.clickedUrl).toBe("https://wbdigitalsolutions.com/lp");
    }
  });

  it("should pick earliest openedAt across multiple sends", async () => {
    const step0 = EmailCampaignStep.create({ campaignId, order: 0, subject: "S0", bodyHtml: "B0", delayDays: 0 });
    const step1 = EmailCampaignStep.create({ campaignId, order: 1, subject: "S1", bodyHtml: "B1", delayDays: 3 });
    await steps.save(step0);
    await steps.save(step1);

    const r = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com",
    });
    await recipients.save(r);

    const early = new Date("2026-05-01T10:00:00Z");
    const late  = new Date("2026-05-02T10:00:00Z");

    const send0 = EmailCampaignSend.reconstitute(
      { recipientId: r.id.toString(), stepId: step0.id.toString(), sentAt: early, openedAt: late },
      new (await import("@/core/unique-entity-id")).UniqueEntityID(),
    );
    const send1 = EmailCampaignSend.reconstitute(
      { recipientId: r.id.toString(), stepId: step1.id.toString(), sentAt: late, openedAt: early },
      new (await import("@/core/unique-entity-id")).UniqueEntityID(),
    );
    await sends.save(send0);
    await sends.save(send1);

    const sut = new GetCampaignProgressUseCase(
      campaigns, recipients, sends, steps,
      makePrismaStub([
        { id: step0.id.toString(), order: 0 },
        { id: step1.id.toString(), order: 1 },
      ]),
    );

    const result = await sut.execute({ campaignId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.recipients[0].openedAt).toEqual(early);
    }
  });

  it("should keep first clickedUrl when recipient clicked multiple sends", async () => {
    const step0 = EmailCampaignStep.create({ campaignId, order: 0, subject: "S0", bodyHtml: "B0", delayDays: 0 });
    const step1 = EmailCampaignStep.create({ campaignId, order: 1, subject: "S1", bodyHtml: "B1", delayDays: 3 });
    await steps.save(step0);
    await steps.save(step1);

    const r = EmailCampaignRecipient.create({
      campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com",
    });
    await recipients.save(r);

    const { UniqueEntityID } = await import("@/core/unique-entity-id");

    const firstClick = new Date("2026-05-01T10:00:00Z");
    const secondClick = new Date("2026-05-01T12:00:00Z");

    const send0 = EmailCampaignSend.reconstitute(
      {
        recipientId: r.id.toString(), stepId: step0.id.toString(), sentAt: firstClick,
        clickedAt: firstClick, clickedUrl: "https://first-link.com",
      },
      new UniqueEntityID(),
    );
    const send1 = EmailCampaignSend.reconstitute(
      {
        recipientId: r.id.toString(), stepId: step1.id.toString(), sentAt: secondClick,
        clickedAt: secondClick, clickedUrl: "https://second-link.com",
      },
      new UniqueEntityID(),
    );
    await sends.save(send0);
    await sends.save(send1);

    const sut = new GetCampaignProgressUseCase(
      campaigns, recipients, sends, steps,
      makePrismaStub([
        { id: step0.id.toString(), order: 0 },
        { id: step1.id.toString(), order: 1 },
      ]),
    );

    const result = await sut.execute({ campaignId });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      // earliest clickedAt wins, so first-link.com
      expect(result.value.recipients[0].clickedUrl).toBe("https://first-link.com");
    }
  });
});
