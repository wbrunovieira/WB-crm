import { Injectable } from "@nestjs/common";
import { Either, left, right } from "@/core/either";
import { PrismaService } from "@/infra/database/prisma.service";
import { EmailCampaignsRepository } from "../repositories/email-campaigns.repository";
import { EmailCampaignRecipientsRepository } from "../repositories/email-campaign-recipients.repository";
import { EmailCampaignRecipient } from "../../enterprise/entities/email-campaign-recipient.entity";

const EMAIL_REGEX = /^[^\s@,;/\\]+@[^\s@,;/\\]+\.[^\s@,;/\\]{2,}$/;

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
    // Deduplicate by email across all sources — same address enrolled only once
    const seenEmails = new Set(existing.map((r) => r.email.toLowerCase()));
    let skipped = 0;
    const toAdd: EmailCampaignRecipient[] = [];

    function tryAdd(key: string, email: string, build: () => EmailCampaignRecipient) {
      if (!EMAIL_REGEX.test(email.trim())) { skipped++; return; }
      if (existingKeys.has(key)) { skipped++; return; }
      const normalized = email.toLowerCase().trim();
      if (seenEmails.has(normalized)) { skipped++; return; }
      toAdd.push(build());
      existingKeys.add(key);
      seenEmails.add(normalized);
    }

    // ── 1. Leads (direct email) ────────────────────────────────────────────────
    const leads = await this.prisma.lead.findMany({
      where: { email: { not: null }, ...ownerFilter, ...sgFilter },
      select: { id: true, businessName: true, email: true, segment: true, sourceGroup: true },
    });

    for (const lead of leads) {
      if (!lead.email) continue;
      tryAdd(`LEAD:${lead.id}`, lead.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "LEAD",
          recipientId: lead.id,
          email: lead.email!,
          name: lead.businessName,
          company: lead.businessName,
          customVars: {
            ...(lead.segment ? { setor: lead.segment } : {}),
            ...(lead.sourceGroup ? { sourceGroup: lead.sourceGroup } : {}),
          },
        }),
      );
    }

    // ── 2. LeadContacts ────────────────────────────────────────────────────────
    const leadContacts = await this.prisma.leadContact.findMany({
      where: { email: { not: null }, lead: { ...ownerFilter, ...sgFilter } },
      select: {
        id: true, name: true, email: true, role: true,
        lead: { select: { businessName: true, segment: true, sourceGroup: true } },
      },
    });

    for (const lc of leadContacts) {
      if (!lc.email) continue;
      tryAdd(`LEAD_CONTACT:${lc.id}`, lc.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "LEAD",
          recipientId: lc.id,
          email: lc.email!,
          name: lc.name ?? undefined,
          company: lc.lead?.businessName ?? undefined,
          role: lc.role ?? undefined,
          customVars: {
            ...(lc.lead?.segment ? { setor: lc.lead.segment } : {}),
            ...(lc.lead?.sourceGroup ? { sourceGroup: lc.lead.sourceGroup } : {}),
          },
        }),
      );
    }

    // ── 3. Contacts linked to Organizations ────────────────────────────────────
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
      tryAdd(`CONTACT:${c.id}`, c.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: c.id,
          email: c.email!,
          name: c.name ?? undefined,
          company: c.organization?.name ?? undefined,
          role: c.role ?? undefined,
          customVars: {
            ...(c.organization?.segment ? { setor: c.organization.segment } : {}),
            ...(c.organization?.sourceGroup ? { sourceGroup: c.organization.sourceGroup } : {}),
          },
        }),
      );
    }

    // ── 4. Contacts linked directly to Leads ───────────────────────────────────
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
      tryAdd(`CONTACT:${c.id}`, c.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: c.id,
          email: c.email!,
          name: c.name ?? undefined,
          company: c.lead?.businessName ?? undefined,
          role: c.role ?? undefined,
          customVars: {
            ...(c.lead?.segment ? { setor: c.lead.segment } : {}),
            ...(c.lead?.sourceGroup ? { sourceGroup: c.lead.sourceGroup } : {}),
          },
        }),
      );
    }

    // ── 5. Organizations (company email) ───────────────────────────────────────
    const orgs = await this.prisma.organization.findMany({
      where: { email: { not: null }, ...ownerFilter, ...sgFilter },
      select: { id: true, name: true, email: true, segment: true, sourceGroup: true },
    });

    for (const org of orgs) {
      if (!org.email) continue;
      tryAdd(`CONTACT:${org.id}`, org.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: org.id,
          email: org.email!,
          name: org.name,
          company: org.name,
          customVars: {
            ...(org.segment ? { setor: org.segment } : {}),
            ...(org.sourceGroup ? { sourceGroup: org.sourceGroup } : {}),
          },
        }),
      );
    }

    // ── 6. Contacts linked to Partners ────────────────────────────────────────
    const partnerContacts = await this.prisma.contact.findMany({
      where: { email: { not: null }, partnerId: { not: null }, ownerId: input.ownerId },
      select: {
        id: true, name: true, email: true, role: true,
        partner: { select: { name: true } },
      },
    });

    for (const c of partnerContacts) {
      if (!c.email) continue;
      tryAdd(`CONTACT:${c.id}`, c.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: c.id,
          email: c.email!,
          name: c.name ?? undefined,
          company: c.partner?.name ?? undefined,
          role: c.role ?? undefined,
        }),
      );
    }

    // ── 7. Standalone Contacts (no lead/org/partner link) ─────────────────────
    const standaloneContacts = await this.prisma.contact.findMany({
      where: {
        email: { not: null },
        ownerId: input.ownerId,
        organizationId: null,
        leadId: null,
        partnerId: null,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    for (const c of standaloneContacts) {
      if (!c.email) continue;
      tryAdd(`CONTACT:${c.id}`, c.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: c.id,
          email: c.email!,
          name: c.name ?? undefined,
          role: c.role ?? undefined,
        }),
      );
    }

    // ── 8. Partners (company email) ────────────────────────────────────────────
    const partners = await this.prisma.partner.findMany({
      where: { email: { not: null }, ownerId: input.ownerId },
      select: { id: true, name: true, email: true },
    });

    for (const p of partners) {
      if (!p.email) continue;
      tryAdd(`CONTACT:${p.id}`, p.email, () =>
        EmailCampaignRecipient.create({
          campaignId: input.campaignId,
          recipientType: "CONTACT",
          recipientId: p.id,
          email: p.email!,
          name: p.name,
          company: p.name,
        }),
      );
    }

    if (toAdd.length > 0) await this.recipients.saveMany(toAdd);

    return right({ enrolled: toAdd.length, skipped });
  }
}
