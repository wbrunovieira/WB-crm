"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendEmail } from "@/lib/google/gmail";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "gmail-action" });

const attachmentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  data: z.string().min(1), // base64
});

const sendGmailSchema = z.object({
  to: z.string().email("E-mail do destinatário inválido"),
  subject: z.string().min(1, "Assunto obrigatório"),
  html: z.string().min(1, "Corpo do e-mail obrigatório"),
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

    try {
      const result = await sendEmail({
        to: validated.to,
        subject: validated.subject,
        html: validated.html,
        threadId: validated.threadId,
        attachments: validated.attachments,
      });

      messageId = result.messageId;
      threadId = result.threadId;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("Falha ao enviar e-mail via Gmail", { error: message, to: validated.to });
      return { success: false, error: message };
    }

    // Preview do corpo (primeiros 500 chars sem tags HTML)
    const bodyPreview = validated.html
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 500);

    await prisma.activity.create({
      data: {
        type: "email",
        subject: validated.subject,
        description: bodyPreview,
        emailMessageId: messageId,
        emailSubject: validated.subject,
        completed: true,
        completedAt: new Date(),
        ownerId: session.user.id,
        ...(validated.contactId ? { contactId: validated.contactId } : {}),
        ...(validated.leadId ? { leadId: validated.leadId } : {}),
        ...(validated.organizationId ? { organizationId: validated.organizationId } : {}),
        ...(validated.dealId ? { dealId: validated.dealId } : {}),
      },
    });

    log.info("E-mail enviado e Activity criada", { to: validated.to, messageId });

    // Revalidar páginas relevantes
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
