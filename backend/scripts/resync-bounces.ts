/**
 * One-time script: re-process Gmail bounce NDRs from the last N days
 * using the updated extraction patterns.
 *
 * Usage (on production server, inside /opt/wb-crm-backend):
 *   npx ts-node -r tsconfig-paths/register scripts/resync-bounces.ts [daysBack]
 *
 * Default: 90 days back. The script is idempotent — already-BOUNCED
 * recipients and existing suppressions are left unchanged.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const daysBack = parseInt(process.argv[2] ?? "90", 10);

// ── Helpers ──────────────────────────────────────────────────────────────────

function isBounceMessage(from: string, subject: string): boolean {
  const lower = from.toLowerCase();
  if (
    lower.includes("mailer-daemon") ||
    lower.includes("postmaster@") ||
    lower.includes("mail delivery subsystem")
  ) return true;

  const subjectLower = subject.toLowerCase();
  return (
    subjectLower.startsWith("undeliverable:") ||
    subjectLower.includes("mail delivery failed") ||
    subjectLower.includes("returned mail:")
  );
}

function extractBouncedEmail(body: string | undefined): string | undefined {
  if (!body) return undefined;
  const bodyText = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const ep = "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";

  const tests: RegExp[] = [
    new RegExp(`Final-Recipient:\\s*rfc822;\\s*(${ep})`, "i"),
    new RegExp(`Original-Recipient:\\s*rfc822;\\s*(${ep})`, "i"),
    new RegExp(`wasn't delivered to\\s+(${ep})`, "i"),
    new RegExp(`message to\\s+(${ep})\\s+(?:couldn't|could not) be delivered`, "i"),
    new RegExp(`não foi entregue para\\s+(${ep})`, "i"),
    new RegExp(`não foi entregue a\\s+(${ep})`, "i"),
    new RegExp(`entregar a mensagem a\\s+(${ep})`, "i"),
    new RegExp(`entrega da mensagem para\\s+(${ep})`, "i"),
    new RegExp(`address(?:es)?\\s+failed[:\\s]+(${ep})`, "i"),
    new RegExp(`fatal errors.*?-*\\s*<?(${ep})`, "i"),
    new RegExp(`failed.*?(?:to|recipients?)[:\\s]+(${ep})`, "i"),
  ];

  for (const re of tests) {
    const m = bodyText.match(re);
    if (m) return m[1].toLowerCase();
  }
  return undefined;
}

// ── Gmail API helpers ─────────────────────────────────────────────────────────

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const d = await res.json() as { access_token: string };
  return d.access_token;
}

async function listMessageIds(token: string, query: string, maxResults = 500): Promise<string[]> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`messages.list error: ${await res.text()}`);
  const d = await res.json() as { messages?: Array<{ id: string }> };
  return (d.messages ?? []).map(m => m.id);
}

function decodeBase64(s: string): string {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractPart(payload: any, mimeType: string): string | undefined {
  if (payload.mimeType === mimeType && payload.body?.data) {
    return decodeBase64(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const found = extractPart(part, mimeType);
    if (found) return found;
  }
  return undefined;
}

async function getMessage(
  token: string,
  messageId: string,
): Promise<{ from: string; subject: string; bodyText: string; bodyHtml: string } | null> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getMessage error: ${await res.text()}`);

  const data = await res.json() as any;
  const headers: Array<{ name: string; value: string }> = data.payload?.headers ?? [];
  const from = headers.find((h: any) => h.name.toLowerCase() === "from")?.value ?? "";
  const subject = headers.find((h: any) => h.name.toLowerCase() === "subject")?.value ?? "";
  const bodyText = extractPart(data.payload, "text/plain") ?? "";
  const bodyHtml = extractPart(data.payload, "text/html") ?? "";

  return { from, subject, bodyText, bodyHtml };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔄 Resync bounces — últimos ${daysBack} dias\n`);

  // Get all Google tokens (one per user)
  const tokens = await prisma.googleToken.findMany({
    select: { id: true, refreshToken: true },
    where: { refreshToken: { not: undefined } },
  });

  if (tokens.length === 0) {
    console.log("Nenhum token Google encontrado.");
    return;
  }

  let totalFound = 0;
  let totalBounced = 0;
  let totalSkipped = 0;

  for (const googleToken of tokens) {
    const ownerId = googleToken.id;
    console.log(`\n👤 Owner: ${ownerId}`);

    let accessToken: string;
    try {
      accessToken = await getAccessToken(googleToken.refreshToken!);
    } catch (e) {
      console.error(`  ❌ Falha ao obter access token: ${(e as Error).message}`);
      continue;
    }

    // Get all campaign IDs for this owner
    const campaigns = await prisma.emailCampaign.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const campaignIds = campaigns.map(c => c.id);

    if (campaignIds.length === 0) {
      console.log("  Nenhuma campanha encontrada.");
      continue;
    }

    const query = `from:(mailer-daemon OR postmaster) newer_than:${daysBack}d`;
    console.log(`  🔍 Query: ${query}`);

    let messageIds: string[];
    try {
      messageIds = await listMessageIds(accessToken, query);
    } catch (e) {
      console.error(`  ❌ Falha ao listar mensagens: ${(e as Error).message}`);
      continue;
    }

    console.log(`  📬 ${messageIds.length} mensagens encontradas`);
    totalFound += messageIds.length;

    for (const messageId of messageIds) {
      const msg = await getMessage(accessToken, messageId);
      if (!msg) continue;

      if (!isBounceMessage(msg.from, msg.subject)) continue;

      const bouncedEmail =
        extractBouncedEmail(msg.bodyText) ?? extractBouncedEmail(msg.bodyHtml);

      if (!bouncedEmail) {
        totalSkipped++;
        continue;
      }

      // Mark recipients as BOUNCED
      const updated = await prisma.emailCampaignRecipient.updateMany({
        where: {
          email: bouncedEmail,
          campaignId: { in: campaignIds },
          status: { notIn: ["BOUNCED", "UNSUBSCRIBED"] },
        },
        data: { status: "BOUNCED" },
      });

      // Add to suppression list if not already there
      const alreadySuppressed = await prisma.emailSuppression.findFirst({
        where: { email: bouncedEmail, ownerId },
      });

      if (!alreadySuppressed) {
        await prisma.emailSuppression.create({
          data: {
            id: crypto.randomUUID(),
            email: bouncedEmail,
            ownerId,
            reason: "bounced",
            createdAt: new Date(),
          },
        });
      }

      // Mark linked campaign_email activities as failed
      const bouncedRecipients = await prisma.emailCampaignRecipient.findMany({
        where: { email: bouncedEmail, campaignId: { in: campaignIds } },
        select: { id: true },
      });
      if (bouncedRecipients.length > 0) {
        const recipientIds = bouncedRecipients.map(r => r.id);
        const sends = await prisma.emailCampaignSend.findMany({
          where: { recipientId: { in: recipientIds } },
          select: { id: true },
        });
        if (sends.length > 0) {
          const sendIds = sends.map(s => s.id);
          const activityUpdateResult = await prisma.activity.updateMany({
            where: {
              emailCampaignSendId: { in: sendIds },
              failedAt: null,
            },
            data: {
              completed: false,
              completedAt: null,
              failedAt: new Date(),
              failReason: "Email retornou (bounce)",
            },
          });
          if (activityUpdateResult.count > 0) {
            console.log(`    📝 ${activityUpdateResult.count} atividade(s) marcada(s) como falha`);
          }
        }
      }

      if (updated.count > 0) {
        console.log(`  ✅ ${bouncedEmail} → BOUNCED (${updated.count} recipient(s))`);
        totalBounced++;
      } else {
        console.log(`  ↩️  ${bouncedEmail} já estava processado`);
        totalSkipped++;
      }
    }
  }

  console.log(`
📊 Resultado:
  Mensagens encontradas : ${totalFound}
  Novos bounces         : ${totalBounced}
  Já processados/sem match: ${totalSkipped}
`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
