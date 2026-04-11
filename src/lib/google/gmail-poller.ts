import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { getAuthenticatedClient } from "./auth";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "gmail-poller" });

export interface ParsedHeaders {
  from: string;
  fromName: string;
  subject: string;
}

export interface PolledEmail {
  messageId: string;
  threadId: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

export interface PollResult {
  emails: PolledEmail[];
  newHistoryId: string;
}

/** Extrai from, fromName e subject dos cabeçalhos MIME */
export function parseEmailHeaders(
  headers: Array<{ name?: string | null; value?: string | null }>
): ParsedHeaders {
  const get = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? "";

  const fromRaw = get("From");
  const subject = get("Subject") || "(sem assunto)";

  // Formato: "Nome <email@exemplo.com>" ou só "email@exemplo.com"
  const match = fromRaw.match(/^(.+?)\s*<([^>]+)>$/);
  const from = match ? match[2].trim() : fromRaw.trim();
  const fromName = match ? match[1].replace(/^["']|["']$/g, "").trim() : from;

  return { from, fromName, subject };
}

/** Extrai texto plano do payload da mensagem Gmail */
function extractBody(payload: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";

  // Corpo direto (text/plain ou text/html simples)
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, "base64url").toString("utf-8");
  }

  // Multipart — procura text/plain primeiro, depois text/html
  const parts = payload.parts ?? [];
  const plain = parts.find((p) => p.mimeType === "text/plain");
  if (plain?.body?.data) {
    return Buffer.from(plain.body.data, "base64url").toString("utf-8");
  }
  const html = parts.find((p) => p.mimeType === "text/html");
  if (html?.body?.data) {
    const raw = Buffer.from(html.body.data, "base64url").toString("utf-8");
    // Remove tags HTML e decodifica entidades para preview limpo
    return raw
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  return "";
}

/**
 * Busca e-mails novos da INBOX desde o historyId fornecido.
 * Aceita gmailClient injetado para facilitar testes unitários.
 */
export async function pollNewEmails(
  sinceHistoryId: string,
  gmailClient?: gmail_v1.Gmail
): Promise<PollResult> {
  let gmail = gmailClient;

  if (!gmail) {
    const auth = await getAuthenticatedClient();
    gmail = google.gmail({ version: "v1", auth });
  }

  // 1. Buscar histórico desde o último historyId conhecido
  const historyRes = await gmail.users.history.list({
    userId: "me",
    startHistoryId: sinceHistoryId,
    historyTypes: ["messageAdded"],
    labelId: "INBOX",
  });

  const historyData = historyRes.data;
  const newHistoryId = historyData.historyId ?? sinceHistoryId;

  const historyItems = historyData.history ?? [];
  if (historyItems.length === 0) {
    return { emails: [], newHistoryId };
  }

  // 2. Coletar IDs de mensagens adicionadas à INBOX
  const inboxMessageIds: Array<{ id: string; threadId: string }> = [];

  for (const item of historyItems) {
    for (const added of item.messagesAdded ?? []) {
      const msg = added.message;
      if (!msg?.id) continue;
      // Filtrar apenas INBOX (exclui SENT, SPAM, DRAFT, etc.)
      const labels = msg.labelIds ?? [];
      if (!labels.includes("INBOX")) continue;
      inboxMessageIds.push({ id: msg.id, threadId: msg.threadId ?? "" });
    }
  }

  if (inboxMessageIds.length === 0) {
    return { emails: [], newHistoryId };
  }

  // 3. Buscar detalhes de cada mensagem
  const emails: PolledEmail[] = [];

  for (const { id, threadId } of inboxMessageIds) {
    try {
      const msgRes = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "full",
      });

      const msg = msgRes.data;
      const headers = msg.payload?.headers ?? [];
      const { from, fromName, subject } = parseEmailHeaders(headers);
      const body = extractBody(msg.payload ?? {});

      const dateHeader = headers.find((h) => h.name?.toLowerCase() === "date")?.value;
      const receivedAt = dateHeader ? new Date(dateHeader) : new Date();

      emails.push({
        messageId: id,
        threadId,
        from,
        fromName,
        subject,
        body,
        receivedAt,
      });
    } catch (err) {
      log.warn("Falha ao buscar detalhes de mensagem, pulando", {
        messageId: id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  log.info("Poll Gmail concluído", {
    sinceHistoryId,
    newHistoryId,
    found: emails.length,
  });

  return { emails, newHistoryId };
}
