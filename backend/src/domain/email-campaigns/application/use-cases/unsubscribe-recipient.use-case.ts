import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailSuppressionsRepository } from "../repositories/email-suppressions.repository";
import { EmailCampaignSendsRepository } from "../repositories/email-campaign-sends.repository";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailSuppression } from "../../enterprise/entities/email-suppression.entity";

interface Input { sendId: string; }

@Injectable()
export class UnsubscribeRecipientUseCase {
  constructor(
    private readonly recipients: EmailCampaignRecipientsRepository,
    private readonly suppressions: EmailSuppressionsRepository,
    private readonly sends: EmailCampaignSendsRepository,
    private readonly campaigns: EmailCampaignsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, { email: string }>> {
    const send = await this.sends.findById(input.sendId);
    if (!send) return left(new Error("Send not found"));

    const recipient = await this.recipients.findById(send.recipientId);
    if (!recipient) return left(new Error("Recipient not found"));

    const campaign = await this.campaigns.findById(recipient.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));

    if (recipient.status !== "UNSUBSCRIBED") {
      recipient.unsubscribe();
      await this.recipients.save(recipient);
    }

    const alreadySuppressed = await this.suppressions.findByEmail(recipient.email, campaign.ownerId);
    if (!alreadySuppressed) {
      const suppression = EmailSuppression.create({ email: recipient.email, ownerId: campaign.ownerId, reason: "unsubscribed" });
      await this.suppressions.save(suppression);
    }

    return right({ email: recipient.email });
  }
}
