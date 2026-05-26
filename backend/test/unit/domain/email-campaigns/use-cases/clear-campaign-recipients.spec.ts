import { describe, it, expect } from "vitest";
import { ClearCampaignRecipientsUseCase } from "@/domain/email-campaigns/application/use-cases/clear-campaign-recipients.use-case";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignRecipientsRepository } from "../fakes/in-memory-email-campaign-recipients.repository";
import { EmailCampaignRecipient } from "@/domain/email-campaigns/enterprise/entities/email-campaign-recipient.entity";

const OWNER = "owner-1";
const OTHER = "owner-2";
const FROM = "bruno@wbdigitalsolutions.com";

async function makeBase() {
  const campaigns = new InMemoryEmailCampaignsRepository();
  const recipients = new InMemoryEmailCampaignRecipientsRepository();
  const sut = new ClearCampaignRecipientsUseCase(campaigns, recipients);

  const created = await new CreateEmailCampaignUseCase(campaigns).execute({ name: "C1", fromEmail: FROM, ownerId: OWNER });
  const campaignId = (created.value as { id: string }).id;

  const r1 = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l1", email: "a@b.com" });
  const r2 = EmailCampaignRecipient.create({ campaignId, recipientType: "LEAD", recipientId: "l2", email: "c@d.com" });
  await recipients.save(r1);
  await recipients.save(r2);

  return { sut, campaigns, recipients, campaignId };
}

describe("ClearCampaignRecipientsUseCase", () => {
  it("removes all recipients and returns deleted count", async () => {
    const { sut, recipients, campaignId } = await makeBase();

    const result = await sut.execute({ campaignId, ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    expect((result.value as { deleted: number }).deleted).toBe(2);
    const remaining = await recipients.findByCampaign(campaignId);
    expect(remaining).toHaveLength(0);
  });

  it("returns error when campaign not found", async () => {
    const campaigns = new InMemoryEmailCampaignsRepository();
    const recipients = new InMemoryEmailCampaignRecipientsRepository();
    const sut = new ClearCampaignRecipientsUseCase(campaigns, recipients);

    const result = await sut.execute({ campaignId: "nonexistent", ownerId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
  });

  it("returns error when ownerId does not match", async () => {
    const { sut, campaignId } = await makeBase();

    const result = await sut.execute({ campaignId, ownerId: OTHER });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Forbidden");
  });

  it("returns error when campaign is ACTIVE", async () => {
    const { sut, campaigns, recipients, campaignId } = await makeBase();
    const campaign = await campaigns.findById(campaignId);
    campaign!.start();
    await campaigns.save(campaign!);

    const result = await sut.execute({ campaignId, ownerId: OWNER });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("active");
    // Recipients should still be there
    const remaining = await recipients.findByCampaign(campaignId);
    expect(remaining).toHaveLength(2);
  });

  it("returns deleted=0 when campaign has no recipients", async () => {
    const campaigns = new InMemoryEmailCampaignsRepository();
    const recipients = new InMemoryEmailCampaignRecipientsRepository();
    const sut = new ClearCampaignRecipientsUseCase(campaigns, recipients);

    const created = await new CreateEmailCampaignUseCase(campaigns).execute({ name: "Empty", fromEmail: FROM, ownerId: OWNER });
    const campaignId = (created.value as { id: string }).id;

    const result = await sut.execute({ campaignId, ownerId: OWNER });

    expect(result.isRight()).toBe(true);
    expect((result.value as { deleted: number }).deleted).toBe(0);
  });
});
