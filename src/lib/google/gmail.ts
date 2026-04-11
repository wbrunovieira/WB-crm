import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { getAuthenticatedClient } from "./auth";

export interface Attachment {
  filename: string;
  mimeType: string;
  data: string; // base64
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  threadId?: string;
  attachments?: Attachment[];
}

export interface SendEmailResult {
  messageId: string;
  threadId: string;
}

/** Constrói mensagem MIME codificada em base64url para a Gmail API */
export function buildMimeMessage(opts: {
  to: string;
  subject: string;
  html: string;
  from?: string;
  threadId?: string;
  attachments?: Attachment[];
}): string {
  const hasAttachments = (opts.attachments ?? []).length > 0;
  const boundary = `wb_crm_${Date.now()}`;

  const headers: string[] = [];
  if (opts.from) headers.push(`From: ${opts.from}`);
  headers.push(`To: ${opts.to}`);
  headers.push(`Subject: ${opts.subject}`);
  if (opts.threadId) headers.push(`In-Reply-To: ${opts.threadId}`);
  headers.push("MIME-Version: 1.0");

  let body: string;

  if (!hasAttachments) {
    // Simple: single text/html part
    headers.push("Content-Type: text/html; charset=utf-8");
    headers.push("Content-Transfer-Encoding: base64");
    body = headers.join("\r\n") + "\r\n\r\n" + Buffer.from(opts.html).toString("base64");
  } else {
    // Multipart/mixed with HTML body + attachments
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    const parts: string[] = [];

    // HTML part
    parts.push(
      `--${boundary}\r\n` +
      `Content-Type: text/html; charset=utf-8\r\n` +
      `Content-Transfer-Encoding: base64\r\n\r\n` +
      Buffer.from(opts.html).toString("base64")
    );

    // Attachment parts
    for (const att of opts.attachments!) {
      parts.push(
        `--${boundary}\r\n` +
        `Content-Type: ${att.mimeType}\r\n` +
        `Content-Transfer-Encoding: base64\r\n` +
        `Content-Disposition: attachment; filename="${att.filename}"\r\n\r\n` +
        att.data
      );
    }

    body = headers.join("\r\n") + "\r\n\r\n" + parts.join("\r\n") + `\r\n--${boundary}--`;
  }

  return Buffer.from(body).toString("base64url");
}

/** Envia e-mail via Gmail API. Aceita client injetado (para testes) */
export async function sendEmail(
  opts: SendEmailOptions,
  gmailClient?: gmail_v1.Gmail
): Promise<SendEmailResult> {
  let gmail = gmailClient;

  if (!gmail) {
    const auth = await getAuthenticatedClient();
    gmail = google.gmail({ version: "v1", auth });
  }

  const raw = buildMimeMessage(opts);

  const response = await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw,
      ...(opts.threadId ? { threadId: opts.threadId } : {}),
    },
  });

  return {
    messageId: response.data.id!,
    threadId: response.data.threadId!,
  };
}
