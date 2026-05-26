import { Injectable } from "@nestjs/common";
import { Either, right } from "@/core/either";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailSuppressionsRepository } from "../repositories/email-suppressions.repository";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailSuppression } from "../../enterprise/entities/email-suppression.entity";

interface Input {
  email: string;
  ownerId: string;
}

interface Output {
  email: string;
  bouncedCount: number;
}

@Injectable()
export class HandleGmailBounceUseCase {
  constructor(
    private readonly recipients: EmailCampaignRecipientsRepository,
    private readonly suppressions: EmailSuppressionsRepository,
    private readonly campaigns: EmailCampaignsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, Output>> {
    const allRecipients = await this.recipients.findByEmail(input.email);

    let bouncedCount = 0;

    for (const recipient of allRecipients) {
      const campaign = await this.campaigns.findById(recipient.campaignId);
      if (campaign?.ownerId !== input.ownerId) continue;

      if (recipient.status !== "BOUNCED" && recipient.status !== "UNSUBSCRIBED") {
        recipient.markBounced();
        await this.recipients.save(recipient);
        bouncedCount++;
      }
    }

    const alreadySuppressed = await this.suppressions.findByEmail(input.email, input.ownerId);
    if (!alreadySuppressed) {
      const suppression = EmailSuppression.create({ email: input.email, ownerId: input.ownerId, reason: "bounced" });
      await this.suppressions.save(suppression);
    }

    return right({ email: input.email, bouncedCount });
  }
}
