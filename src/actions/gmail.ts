"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { backendFetch } from "@/lib/backend/client";

const log = logger.child({ context: "gmail-action" });

const attachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  data: z.string().min(1),
});

const sendGmailSchema = z.object({
  to: z.string().email("E-mail do destinatário inválido"),
  subject: z.string().min(1, "Assunto obrigatório"),
  html: z.string().min(1, "Corpo do e-mail obrigatório"),
  fromEmail: z.string().email().optional(),
  threadId: z.string().optional(),
  contactId: z.string().optional(),
  leadId: z.string().optional(),
  organizationId: z.string().optional(),
  dealId: z.string().optional(),
  attachments: z.array(attachmentSchema).optional(),
});

export type SendGmailInput = z.infer<typeof sendGmailSchema>;

export interface SendGmailResult {
  success: boolean;
  messageId?: string;
  threadId?: string;
  error?: string;
}

export async function sendGmailMessage(input: SendGmailInput): Promise<SendGmailResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado" };
    }

    const parsed = sendGmailSchema.safeParse(input);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join("; ");
      return { success: false, error: message };
    }
    const validated = parsed.data;

    let messageId: string;
    let threadId: string;
    let trackingToken: string;

    try {
      const result = await backendFetch<{ ok: boolean; messageId: string; threadId: string; trackingToken: string; error?: string }>(
        "/email/send",
        {
          method: "POST",
          body: JSON.stringify({
            to: validated.to,
            subject: validated.subject,
            bodyHtml: validated.html,
            fromEmail: validated.fromEmail,
            threadId: validated.threadId,
            attachments: validated.attachments,
          }),
        },
      );

      if (!result.ok || !result.messageId) {
        log.error("Falha ao enviar e-mail via NestJS", { error: result.error, to: validated.to });
        return { success: false, error: result.error ?? "Falha ao enviar e-mail" };
      }

      messageId = result.messageId;
      threadId = result.threadId;
      trackingToken = result.trackingToken;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("Falha ao enviar e-mail via Gmail", { error: message, to: validated.to });
      return { success: false, error: message };
    }

    const bodyPreview = validated.html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    if (validated.threadId) {
      await backendFetch("/activities/mark-thread-replied", {
        method: "PATCH",
        body: JSON.stringify({ threadId: validated.threadId }),
      }).catch(() => {});
    }

    await backendFetch("/activities", {
      method: "POST",
      body: JSON.stringify({
        type: "email",
        subject: validated.subject,
        description: bodyPreview,
        emailMessageId: messageId,
        emailThreadId: threadId,
        emailSubject: validated.subject,
        emailTrackingToken: trackingToken,
        completed: true,
        completedAt: new Date().toISOString(),
        contactIds: validated.contactId ? [validated.contactId] : undefined,
        leadId: validated.leadId,
        organizationId: validated.organizationId,
        dealId: validated.dealId,
      }),
    });

    log.info("E-mail enviado e Activity criada", { to: validated.to, messageId });

    if (validated.contactId) revalidatePath(`/contacts/${validated.contactId}`);
    if (validated.leadId) revalidatePath(`/leads/${validated.leadId}`);
    if (validated.organizationId) revalidatePath(`/organizations/${validated.organizationId}`);
    if (validated.dealId) revalidatePath(`/deals/${validated.dealId}`);

    return { success: true, messageId, threadId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Erro inesperado no sendGmailMessage", { error: message });
    return { success: false, error: message };
  }
}
