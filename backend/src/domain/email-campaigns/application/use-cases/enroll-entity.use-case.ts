import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { EnrollmentSourceRepository } from "../repositories/enrollment-source.repository";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignRecipient } from "../../enterprise/entities/email-campaign-recipient.entity";

interface Input {
  campaignId: string;
  entityType: "lead" | "organization";
  entityId: string;
  ownerId: string;
}

@Injectable()
export class EnrollEntityUseCase {
  constructor(
    private readonly source: EnrollmentSourceRepository,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, { enrolled: number; skipped: number }>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));

    const existing = await this.recipients.findByCampaign(input.campaignId);
    const existingKeys = new Set(existing.map((r) => `${r.recipientType}:${r.recipientId}`));

    const toAdd: EmailCampaignRecipient[] = [];
    let skipped = 0;

    if (input.entityType === "lead") {
      const lead = await this.source.findLeadEnrollment(input.entityId);

      if (!lead) return left(new Error("Lead not found"));

      // Enroll lead's own email
      if (lead.email) {
        const key = `LEAD:${lead.id}`;
        if (existingKeys.has(key)) {
          skipped++;
        } else {
          toAdd.push(
            EmailCampaignRecipient.create({
              campaignId: input.campaignId,
              recipientType: "LEAD",
              recipientId: lead.id,
              email: lead.email,
              name: lead.businessName ?? undefined,
              company: lead.businessName ?? undefined,
              customVars: {
                ...(lead.segment ? { setor: lead.segment } : {}),
                ...(lead.sourceGroup ? { sourceGroup: lead.sourceGroup } : {}),
              },
            }),
          );
          existingKeys.add(key);
        }
      }

      // Enroll each leadContact with an email
      for (const lc of lead.contacts) {
        if (!lc.email) continue;
        const key = `LEAD:${lc.id}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        toAdd.push(
          EmailCampaignRecipient.create({
            campaignId: input.campaignId,
            recipientType: "LEAD",
            recipientId: lc.id,
            email: lc.email,
            name: lc.name ?? undefined,
            company: lead.businessName ?? undefined,
            role: lc.role ?? undefined,
            customVars: {
              ...(lead.segment ? { setor: lead.segment } : {}),
              ...(lead.sourceGroup ? { sourceGroup: lead.sourceGroup } : {}),
            },
          }),
        );
        existingKeys.add(key);
      }
    } else {
      // organization
      const org = await this.source.findOrgEnrollment(input.entityId);

      if (!org) return left(new Error("Organization not found"));

      // Enroll org's own email
      if (org.email) {
        const key = `CONTACT:${org.id}`;
        if (existingKeys.has(key)) {
          skipped++;
        } else {
          toAdd.push(
            EmailCampaignRecipient.create({
              campaignId: input.campaignId,
              recipientType: "CONTACT",
              recipientId: org.id,
              email: org.email,
              name: org.name ?? undefined,
              company: org.name ?? undefined,
              customVars: {
                ...(org.segment ? { setor: org.segment } : {}),
                ...(org.sourceGroup ? { sourceGroup: org.sourceGroup } : {}),
              },
            }),
          );
          existingKeys.add(key);
        }
      }

      // Enroll each contact with an email
      for (const c of org.contacts) {
        if (!c.email) continue;
        const key = `CONTACT:${c.id}`;
        if (existingKeys.has(key)) {
          skipped++;
          continue;
        }
        toAdd.push(
          EmailCampaignRecipient.create({
            campaignId: input.campaignId,
            recipientType: "CONTACT",
            recipientId: c.id,
            email: c.email,
            name: c.name ?? undefined,
            company: org.name ?? undefined,
            role: c.role ?? undefined,
            customVars: {
              ...(org.segment ? { setor: org.segment } : {}),
              ...(org.sourceGroup ? { sourceGroup: org.sourceGroup } : {}),
            },
          }),
        );
        existingKeys.add(key);
      }
    }

    if (toAdd.length > 0) await this.recipients.saveMany(toAdd);

    return right({ enrolled: toAdd.length, skipped });
  }
}
