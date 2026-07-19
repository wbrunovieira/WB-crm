import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EnrollmentSourceRepository } from "../repositories/enrollment-source.repository";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignRecipient } from "../../enterprise/entities/email-campaign-recipient.entity";
import { EmailAddress } from "@/domain/integrations/email/enterprise/value-objects/email-address.vo";

type EnrollMode = "all" | "sourceGroup";

interface Input {
  campaignId: string;
  ownerId: string;
  mode: EnrollMode;
  sourceGroup?: string;
}

@Injectable()
export class BulkEnrollUseCase {
  constructor(
    private readonly source: EnrollmentSourceRepository,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, { enrolled: number; skipped: number }>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));
    if (campaign.ownerId !== input.ownerId) return left(new Error("Forbidden"));

    const sourceGroup = input.mode === "sourceGroup" ? input.sourceGroup : undefined;
    const candidates = await this.source.findBulkEnrollmentCandidates(input.ownerId, sourceGroup);

    const existing = await this.recipients.findByCampaign(input.campaignId);
    const existingKeys = new Set(existing.map((r) => `${r.recipientType}:${r.recipientId}`));
    // Deduplicate by email across all sources — same address enrolled only once
    const seenEmails = new Set(existing.map((r) => r.email.toLowerCase()));
    let skipped = 0;
    const toAdd: EmailCampaignRecipient[] = [];

    for (const c of candidates) {
      // Email format validation lives in the EmailAddress VO, not inline.
      const emailVo = EmailAddress.create(c.email);
      if (emailVo.isLeft()) { skipped++; continue; }
      const normalized = emailVo.value.value; // trimmed + lowercased by the VO

      if (existingKeys.has(c.dedupKey)) { skipped++; continue; }
      if (seenEmails.has(normalized)) { skipped++; continue; }

      toAdd.push(
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: c.recipientType,
          recipientId: c.recipientId,
          email: c.email,
          name: c.name,
          company: c.company,
          role: c.role,
          language: c.language,
          customVars: c.customVars,
        }),
      );
      existingKeys.add(c.dedupKey);
      seenEmails.add(normalized);
    }

    if (toAdd.length > 0) await this.recipients.saveMany(toAdd);

    return right({ enrolled: toAdd.length, skipped });
  }
}
