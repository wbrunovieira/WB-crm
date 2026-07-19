import { describe, it, expect } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { SendCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/send-campaign-step.use-case";
import { VariableResolverService } from "@/domain/email-campaigns/application/services/variable-resolver.service";
import { EmailCampaign } from "@/domain/email-campaigns/enterprise/entities/email-campaign.entity";
import { EmailCampaignStep } from "@/domain/email-campaigns/enterprise/entities/email-campaign-step.entity";
import { EmailCampaignRecipient } from "@/domain/email-campaigns/enterprise/entities/email-campaign-recipient.entity";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignStepsRepository } from "../fakes/in-memory-email-campaign-steps.repository";
import { InMemoryEmailCampaignRecipientsRepository } from "../fakes/in-memory-email-campaign-recipients.repository";
import { InMemoryEmailCampaignSendsRepository } from "../fakes/in-memory-email-campaign-sends.repository";
import { InMemoryEmailSuppressionsRepository } from "../fakes/in-memory-email-suppressions.repository";
import { InMemoryActivitiesRepository } from "../fakes/in-memory-activities.repository";
import { FakeGmailPortForCampaigns } from "../fakes/fake-gmail.port";
import { FakeRecipientContextPort } from "../fakes/fake-recipient-context.port";

/** Campaigns repo that flips ACTIVE → PAUSED after the loop's first status read. */
class PausingCampaignsRepo extends InMemoryEmailCampaignsRepository {
  calls = 0;
  async findById(id: string) {
    this.calls++;
    const c = await super.findById(id);
    // calls: 1 = pre-loop guard, 2 = recipient #1 guard (still ACTIVE),
    // 3 = recipient #2 guard → pause now so the loop stops before sending #2.
    if (c && this.calls >= 3) c.pause();
    return c;
  }
}

describe("SendCampaignStepUseCase — honors pause mid-send", () => {
  it("stops sending once the campaign is paused during the loop", async () => {
    const campaigns = new PausingCampaignsRepo();
    const steps = new InMemoryEmailCampaignStepsRepository();
    const recipients = new InMemoryEmailCampaignRecipientsRepository();
    const sends = new InMemoryEmailCampaignSendsRepository();
    const gmail = new FakeGmailPortForCampaigns();
    const resolver = new VariableResolverService();
    const suppressions = new InMemoryEmailSuppressionsRepository();
    const activities = new InMemoryActivitiesRepository();
    const context = new FakeRecipientContextPort();

    const sut = new SendCampaignStepUseCase(
      campaigns, steps, recipients, ({ findByStep: async () => [] } as never), sends,
      gmail as never, resolver, suppressions, activities as never, context as never,
    );

    campaigns.items.push(
      EmailCampaign.create({ name: "C", fromEmail: "f@x.com", status: "ACTIVE", ownerId: "o1" }, new UniqueEntityID("camp-1")),
    );
    steps.items.push(
      EmailCampaignStep.create({ campaignId: "camp-1", order: 0, subject: "S", bodyHtml: "<p>oi</p>", delayDays: 0 }, new UniqueEntityID("step-1")),
    );
    for (let i = 1; i <= 3; i++) {
      recipients.items.push(
        EmailCampaignRecipient.create(
          { campaignId: "camp-1", recipientType: "LEAD", recipientId: `l${i}`, email: `r${i}@x.com` },
          new UniqueEntityID(`rec-${i}`),
        ),
      );
    }

    const result = await sut.execute({ campaignId: "camp-1", stepOrder: 0, delayRange: { min: 0, max: 0 } });

    expect(result.isRight()).toBe(true);
    // Only the first recipient went out; the pause stopped the loop before #2 and #3.
    if (result.isRight()) expect(result.value.sent).toBe(1);
    // Two recipients remain untouched (still PENDING at step 0).
    const stillPending = recipients.items.filter((r) => r.status === "PENDING" && r.currentStep === 0);
    expect(stillPending).toHaveLength(2);
  });
});
