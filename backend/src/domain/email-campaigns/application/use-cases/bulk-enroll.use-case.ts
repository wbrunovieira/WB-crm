import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignRecipient } from "../../enterprise/entities/email-campaign-recipient.entity";

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
    private readonly prisma: PrismaService,
    private readonly campaigns: EmailCampaignsRepository,
    private readonly recipients: EmailCampaignRecipientsRepository,
  ) {}

  async execute(input: Input): Promise<Either<Error, { enrolled: number; skipped: number }>> {
    const campaign = await this.campaigns.findById(input.campaignId);
    if (!campaign) return left(new Error("Campaign not found"));
    if (campaign.ownerId !== input.ownerId) return left(new Error("Forbidden"));

    const ownerFilter = { ownerId: input.ownerId };
    const sgFilter =
      input.mode === "sourceGroup" && input.sourceGroup
        ? { sourceGroup: input.sourceGroup }
        : {};

    const existing = await this.recipients.findByCampaign(input.campaignId);
    const existingKeys = new Set(existing.map((r) => `${r.recipientType}:${r.recipientId}`));
    let skipped = 0;
    const toAdd: EmailCampaignRecipient[] = [];

    // ── 1. LeadContacts ────────────────────────────────────────────────────────
    const leadContacts = await this.prisma.leadContact.findMany({
      where: { email: { not: null }, lead: { ...ownerFilter, ...sgFilter } },
      select: {
        id: true, name: true, email: true, role: true,
        lead: { select: { businessName: true, segment: true, sourceGroup: true } },
      },
    });

    for (const lc of leadContacts) {
      if (!lc.email) continue;
      const key = `LEAD:${lc.id}`;
      if (existingKeys.has(key)) { skipped++; continue; }
      toAdd.push(
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "LEAD",
          recipientId: lc.id,
          email: lc.email,
          name: lc.name ?? undefined,
          company: lc.lead?.businessName ?? undefined,
          role: lc.role ?? undefined,
          customVars: {
            ...(lc.lead?.segment ? { setor: lc.lead.segment } : {}),
            ...(lc.lead?.sourceGroup ? { sourceGroup: lc.lead.sourceGroup } : {}),
          },
        }),
      );
      existingKeys.add(key);
    }

    // ── 2. Contacts linked to Organizations ────────────────────────────────────
    const orgContacts = await this.prisma.contact.findMany({
      where: {
        email: { not: null },
        organizationId: { not: null },
        organization: { ...ownerFilter, ...sgFilter },
      },
      select: {
        id: true, name: true, email: true, role: true,
        organization: { select: { name: true, segment: true, sourceGroup: true } },
      },
    });

    for (const c of orgContacts) {
      if (!c.email) continue;
      const key = `CONTACT:${c.id}`;
      if (existingKeys.has(key)) { skipped++; continue; }
      toAdd.push(
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: c.id,
          email: c.email,
          name: c.name ?? undefined,
          company: c.organization?.name ?? undefined,
          role: c.role ?? undefined,
          customVars: {
            ...(c.organization?.segment ? { setor: c.organization.segment } : {}),
            ...(c.organization?.sourceGroup ? { sourceGroup: c.organization.sourceGroup } : {}),
          },
        }),
      );
      existingKeys.add(key);
    }

    // ── 3. Contacts linked directly to Leads ───────────────────────────────────
    const leadDirectContacts = await this.prisma.contact.findMany({
      where: {
        email: { not: null },
        organizationId: null,
        leadId: { not: null },
        lead: { ...ownerFilter, ...sgFilter },
      },
      select: {
        id: true, name: true, email: true, role: true,
        lead: { select: { businessName: true, segment: true, sourceGroup: true } },
      },
    });

    for (const c of leadDirectContacts) {
      if (!c.email) continue;
      const key = `CONTACT:${c.id}`;
      if (existingKeys.has(key)) { skipped++; continue; }
      toAdd.push(
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: c.id,
          email: c.email,
          name: c.name ?? undefined,
          company: c.lead?.businessName ?? undefined,
          role: c.role ?? undefined,
          customVars: {
            ...(c.lead?.segment ? { setor: c.lead.segment } : {}),
            ...(c.lead?.sourceGroup ? { sourceGroup: c.lead.sourceGroup } : {}),
          },
        }),
      );
      existingKeys.add(key);
    }

    // ── 4. Organizations (company email) ───────────────────────────────────────
    const orgs = await this.prisma.organization.findMany({
      where: { email: { not: null }, ...ownerFilter, ...sgFilter },
      select: { id: true, name: true, email: true, segment: true, sourceGroup: true },
    });

    for (const org of orgs) {
      if (!org.email) continue;
      // Use "CONTACT" type with org ID — orgs have globally unique cuid IDs
      const key = `CONTACT:${org.id}`;
      if (existingKeys.has(key)) { skipped++; continue; }
      toAdd.push(
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: org.id,
          email: org.email,
          name: org.name,
          company: org.name,
          customVars: {
            ...(org.segment ? { setor: org.segment } : {}),
            ...(org.sourceGroup ? { sourceGroup: org.sourceGroup } : {}),
          },
        }),
      );
      existingKeys.add(key);
    }

    if (toAdd.length > 0) await this.recipients.saveMany(toAdd);

    return right({ enrolled: toAdd.length, skipped });
  }
}
