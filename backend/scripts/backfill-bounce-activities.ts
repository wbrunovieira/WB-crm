/**
 * One-time script: create missing campaign_email bounce activities for
 * email_campaign_recipients that were marked BOUNCED before the
 * createBounceActivity feature existed (added 2026-05-27).
 *
 * Usage (inside /opt/wb-crm-backend, after copying compiled JS):
 *   node backfill-bounce-activities.js [--dry-run]
 *
 * Pass --dry-run to preview without writing.
 * Idempotent: recipients that already have an activity are skipped.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(`\n🔄 Backfill bounce activities${dryRun ? " [DRY RUN]" : ""}\n`);

  // All BOUNCED recipients across all campaigns
  const bouncedRecipients = await prisma.emailCampaignRecipient.findMany({
    where: { status: "BOUNCED" },
    select: {
      id: true,
      email: true,
      name: true,
      recipientType: true,
      recipientId: true,
      campaignId: true,
    },
  });

  console.log(`📋 ${bouncedRecipients.length} recipients com status BOUNCED`);

  // Resolve ownerId per campaign (cache to avoid N+1)
  const campaignOwnerCache = new Map<string, string>();
  async function getOwner(campaignId: string): Promise<string | null> {
    if (campaignOwnerCache.has(campaignId)) return campaignOwnerCache.get(campaignId)!;
    const c = await prisma.emailCampaign.findUnique({ where: { id: campaignId }, select: { ownerId: true } });
    if (!c) return null;
    campaignOwnerCache.set(campaignId, c.ownerId);
    return c.ownerId;
  }

  // Resolve leadId/contactId/orgId/partnerId for a recipient
  async function resolveContext(recipientType: string, recipientId: string) {
    if (recipientType === "LEAD") {
      const lead = await prisma.lead.findUnique({ where: { id: recipientId }, select: { id: true } });
      if (lead) return { leadId: recipientId };
      const lc = await prisma.leadContact.findUnique({ where: { id: recipientId }, select: { leadId: true } });
      if (lc) return { leadId: lc.leadId };
      return {};
    }
    if (recipientType === "CONTACT") {
      const contact = await prisma.contact.findUnique({
        where: { id: recipientId },
        select: { id: true, leadId: true, organizationId: true, partnerId: true },
      });
      if (contact) return {
        contactId: contact.id,
        leadId: contact.leadId ?? undefined,
        organizationId: contact.organizationId ?? undefined,
        partnerId: contact.partnerId ?? undefined,
      };
      const org = await prisma.organization.findUnique({ where: { id: recipientId }, select: { id: true } });
      if (org) return { organizationId: recipientId };
      const partner = await prisma.partner.findUnique({ where: { id: recipientId }, select: { id: true } });
      if (partner) return { partnerId: recipientId };
      return {};
    }
    return {};
  }

  let created = 0;
  let skipped = 0;

  for (const r of bouncedRecipients) {
    const ownerId = await getOwner(r.campaignId);
    if (!ownerId) { skipped++; continue; }

    // Check if an activity already exists for this recipient + campaign
    const existing = await prisma.activity.findFirst({
      where: {
        emailCampaignId: r.campaignId,
        OR: [
          { leadId: r.recipientType === "LEAD" ? r.recipientId : undefined },
          { contactId: r.recipientType === "CONTACT" ? r.recipientId : undefined },
        ],
        type: "campaign_email",
        failedAt: { not: null },
      },
    });

    if (existing) {
      console.log(`  ↩️  ${r.email} — já tem activity (${existing.id})`);
      skipped++;
      continue;
    }

    // Get the first step's subject for the activity label
    const step = await prisma.emailCampaignStep.findFirst({
      where: { campaignId: r.campaignId },
      orderBy: { order: "asc" },
      select: { subject: true },
    });
    const subject = step?.subject ?? "Campanha de email";

    const ctx = await resolveContext(r.recipientType, r.recipientId);
    const hasTarget = ctx.leadId || (ctx as any).contactId || (ctx as any).organizationId || (ctx as any).partnerId;
    if (!hasTarget) {
      console.log(`  ⚠️  ${r.email} — recipiente não encontrado no banco, pulando`);
      skipped++;
      continue;
    }

    console.log(`  ✅ Criando activity bounce para ${r.email}`);

    if (!dryRun) {
      await prisma.activity.create({
        data: {
          id: randomUUID(),
          ownerId,
          type: "campaign_email",
          subject,
          completed: false,
          failedAt: new Date(),
          failReason: "Email retornou (bounce) — backfill histórico",
          emailSubject: subject,
          emailCampaignId: r.campaignId,
          leadId: (ctx as any).leadId ?? null,
          contactId: (ctx as any).contactId ?? null,
          organizationId: (ctx as any).organizationId ?? null,
          partnerId: (ctx as any).partnerId ?? null,
          emailReplied: false,
          emailOpenCount: 0,
          emailLinkClickCount: 0,
          meetingNoShow: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    created++;
  }

  console.log(`
📊 Resultado${dryRun ? " [DRY RUN]" : ""}:
  BOUNCED sem activity : ${created}  → activities criadas
  Já tinham activity   : ${skipped}
`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
