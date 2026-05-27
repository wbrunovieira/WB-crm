/**
 * Backfill: cria atividades do tipo campaign_email para todos os envios
 * de campanhas que ainda não têm uma atividade vinculada.
 *
 * Uso (dentro do container):
 *   node /app/backfill-campaign-activities.js [campaignId]
 *
 * Se campaignId não for informado, processa TODAS as campanhas.
 * Idempotente: pula sends que já têm atividade.
 */

"use strict";

const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const prisma = new PrismaClient();
const filterCampaignId = process.argv[2] ?? null;

// ── Context resolver (replica da lógica de PrismaRecipientContextAdapter) ────

async function resolveContext(recipientType, recipientId) {
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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const campaigns = await prisma.emailCampaign.findMany({
    where: filterCampaignId ? { id: filterCampaignId } : undefined,
    select: { id: true, name: true, ownerId: true },
  });

  if (campaigns.length === 0) {
    console.log("Nenhuma campanha encontrada.");
    return;
  }

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const campaign of campaigns) {
    console.log(`\n📧 Campanha: ${campaign.name} (${campaign.id})`);

    // Busca todos os sends com dados do recipient e step
    const sends = await prisma.emailCampaignSend.findMany({
      where: { recipient: { campaignId: campaign.id } },
      select: {
        id: true,
        sentAt: true,
        openedAt: true,
        openCount: true,
        clickedAt: true,
        gmailMessageId: true,
        gmailThreadId: true,
        recipient: {
          select: {
            recipientType: true,
            recipientId: true,
            email: true,
            status: true,
            unsubscribedAt: true,
          },
        },
        step: {
          select: { subject: true },
        },
      },
    });

    console.log(`  → ${sends.length} sends encontrados`);

    for (const send of sends) {
      // Idempotência: verifica se já existe atividade para este send
      const existingRows = await prisma.$queryRaw`
        SELECT id FROM activities WHERE "emailCampaignSendId" = ${send.id} LIMIT 1
      `;
      if (existingRows.length > 0) {
        totalSkipped++;
        continue;
      }

      const ctx = await resolveContext(send.recipient.recipientType, send.recipient.recipientId);

      // Sem contexto → não dá para vincular a atividade a nenhuma entidade
      if (!ctx.leadId && !ctx.organizationId && !ctx.contactId && !ctx.partnerId) {
        console.log(`  ⚠️  Sem contexto para ${send.recipient.email} — pulando`);
        totalSkipped++;
        continue;
      }

      const subject = send.step.subject || "Email de campanha";
      const status = send.recipient.status;

      // Determina estado da atividade com base no status do recipient
      let completed = false;
      let completedAt = null;
      let failedAt = null;
      let failReason = null;
      let skippedAt = null;
      let skipReason = null;

      if (status === "BOUNCED") {
        failedAt = send.sentAt;
        failReason = "Email retornou (bounce)";
      } else if (status === "UNSUBSCRIBED") {
        skippedAt = send.recipient.unsubscribedAt ?? send.sentAt;
        skipReason = "Cancelou inscrição";
      } else {
        // COMPLETED, ACTIVE, PENDING → enviado com sucesso
        completed = true;
        completedAt = send.sentAt;
      }

      const clickCount = send.clickedAt ? 1 : 0;

      const newId = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO activities (
          id, "ownerId", type, subject, completed, "completedAt",
          "failedAt", "failReason", "skippedAt", "skipReason",
          "meetingNoShow", "emailReplied",
          "emailMessageId", "emailThreadId", "emailSubject",
          "emailOpenCount", "emailOpenedAt",
          "emailLinkClickCount", "emailLinkClickedAt",
          "emailCampaignSendId", "emailCampaignId",
          "leadId", "organizationId", "contactId", "partnerId",
          "createdAt", "updatedAt"
        ) VALUES (
          ${newId}, ${campaign.ownerId}, 'campaign_email', ${subject},
          ${completed}, ${completedAt},
          ${failedAt}, ${failReason}, ${skippedAt}, ${skipReason},
          false, false,
          ${send.gmailMessageId ?? null}, ${send.gmailThreadId ?? null}, ${subject},
          ${send.openCount ?? 0}, ${send.openedAt ?? null},
          ${clickCount}, ${send.clickedAt ?? null},
          ${send.id}, ${campaign.id},
          ${ctx.leadId ?? null}, ${ctx.organizationId ?? null},
          ${ctx.contactId ?? null}, ${ctx.partnerId ?? null},
          ${send.sentAt}, ${send.sentAt}
        )
      `;

      console.log(`  ✅ ${send.recipient.email} → ${status}`);
      totalCreated++;
    }
  }

  console.log(`
📊 Resultado:
  Atividades criadas : ${totalCreated}
  Já existiam/puladas: ${totalSkipped}
`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
