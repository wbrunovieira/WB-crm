/**
 * One-time Node.js script: re-process Gmail bounce NDRs (no ts-node needed).
 * Run inside the backend container:
 *   node /tmp/resync-bounces.js [daysBack]
 */

"use strict";

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const daysBack = parseInt(process.argv[2] ?? "90", 10);

// ── Regex helpers ─────────────────────────────────────────────────────────────

function isBounceMessage(from, subject) {
  const lower = from.toLowerCase();
  if (
    lower.includes("mailer-daemon") ||
    lower.includes("postmaster@") ||
    lower.includes("mail delivery subsystem")
  ) return true;
  const s = (subject || "").toLowerCase();
  return (
    s.startsWith("undeliverable:") ||
    s.includes("mail delivery failed") ||
    s.includes("returned mail:")
  );
}

function extractBouncedEmail(body) {
  if (!body) return undefined;
  const t = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const ep = "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}";
  const patterns = [
    new RegExp(`Final-Recipient:\\s*rfc822;\\s*(${ep})`, "i"),
    new RegExp(`Original-Recipient:\\s*rfc822;\\s*(${ep})`, "i"),
    new RegExp(`wasn't delivered to\\s+(${ep})`, "i"),
    new RegExp(`message to\\s+(${ep})\\s+(?:couldn't|could not) be delivered`, "i"),
    new RegExp(`não foi entregue para\\s+(${ep})`, "i"),
    new RegExp(`não foi entregue a\\s+(${ep})`, "i"),
    new RegExp(`entregar a mensagem a\\s+(${ep})`, "i"),
    new RegExp(`address(?:es)?\\s+failed[:\\s]+(${ep})`, "i"),
    new RegExp(`fatal errors.*?-*\\s*<?(${ep})`, "i"),
    new RegExp(`failed.*?(?:to|recipients?)[:\\s]+(${ep})`, "i"),
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return m[1].toLowerCase();
  }
  return undefined;
}

// ── Gmail API ─────────────────────────────────────────────────────────────────

async function getAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${await res.text()}`);
  const d = await res.json();
  return d.access_token;
}

async function listMessageIds(token, query, maxResults = 500) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`messages.list error: ${await res.text()}`);
  const d = await res.json();
  return (d.messages ?? []).map(m => m.id);
}

function decodeBase64(s) {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractPart(payload, mimeType) {
  if (payload.mimeType === mimeType && payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }
  for (const part of (payload.parts ?? [])) {
    const found = extractPart(part, mimeType);
    if (found) return found;
  }
  return undefined;
}

async function getMessage(token, messageId) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getMessage error: ${await res.text()}`);
  const data = await res.json();
  const headers = data.payload?.headers ?? [];
  const from = (headers.find(h => h.name.toLowerCase() === "from") || {}).value || "";
  const subject = (headers.find(h => h.name.toLowerCase() === "subject") || {}).value || "";
  const bodyText = extractPart(data.payload, "text/plain") ?? "";
  const bodyHtml = extractPart(data.payload, "text/html") ?? "";
  return { from, subject, bodyText, bodyHtml };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔄  Resync bounces — últimos ${daysBack} dias\n`);

  const allTokens = await prisma.googleToken.findMany({
    select: { id: true, email: true, refreshToken: true },
  });
  const tokens = allTokens.filter(t => t.refreshToken);

  if (tokens.length === 0) {
    console.log("Nenhum token Google encontrado.");
    return;
  }

  let totalFound = 0, totalBounced = 0, totalSkipped = 0;

  for (const gt of tokens) {
    // Resolve ownerId: googleToken.id is the token key; user.id is the campaign owner
    const user = await prisma.user.findFirst({
      where: { email: gt.email },
      select: { id: true },
    });

    if (!user) {
      console.log(`\n⚠️  Nenhum usuário encontrado para email ${gt.email} — pulando.`);
      continue;
    }

    const ownerId = user.id;
    console.log(`\n👤  Owner: ${ownerId} (${gt.email})`);

    let accessToken;
    try {
      accessToken = await getAccessToken(gt.refreshToken);
    } catch (e) {
      console.error(`  ❌ Falha ao obter access token: ${e.message}`);
      continue;
    }

    const campaigns = await prisma.emailCampaign.findMany({
      where: { ownerId },
      select: { id: true },
    });
    const campaignIds = campaigns.map(c => c.id);

    if (campaignIds.length === 0) {
      console.log("  Nenhuma campanha.");
      continue;
    }

    const query = `from:(mailer-daemon OR postmaster) newer_than:${daysBack}d`;
    console.log(`  🔍 Query: ${query}`);

    let messageIds;
    try {
      messageIds = await listMessageIds(accessToken, query);
    } catch (e) {
      console.error(`  ❌ Falha ao listar: ${e.message}`);
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

      const updated = await prisma.emailCampaignRecipient.updateMany({
        where: {
          email: bouncedEmail,
          campaignId: { in: campaignIds },
          status: { notIn: ["BOUNCED", "UNSUBSCRIBED"] },
        },
        data: { status: "BOUNCED" },
      });

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

      if (updated.count > 0) {
        console.log(`  ✅  ${bouncedEmail} → BOUNCED (${updated.count})`);
        totalBounced++;
      } else {
        console.log(`  ↩️   ${bouncedEmail} já processado`);
        totalSkipped++;
      }
    }
  }

  console.log(`
📊  Resultado:
  Mensagens encontradas    : ${totalFound}
  Novos bounces registrados: ${totalBounced}
  Já processados/sem match : ${totalSkipped}
`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
