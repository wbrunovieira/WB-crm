import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { getAuthenticatedClient } from "./auth";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
  threadId?: string;
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
}): string {
  const lines: string[] = [];

  if (opts.from) lines.push(`From: ${opts.from}`);
  lines.push(`To: ${opts.to}`);
  lines.push(`Subject: ${opts.subject}`);
  if (opts.threadId) lines.push(`In-Reply-To: ${opts.threadId}`);
  lines.push("MIME-Version: 1.0");
  lines.push("Content-Type: text/html; charset=utf-8");
  lines.push("Content-Transfer-Encoding: quoted-printable");
  lines.push("");
  lines.push(opts.html);

  const mime = lines.join("\r\n");
  return Buffer.from(mime).toString("base64url");
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
