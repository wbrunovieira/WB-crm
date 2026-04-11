import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "email-activity-creator" });

export interface IncomingEmail {
  messageId: string;
  threadId?: string;
  from: string;
  fromName: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

/** Busca Contact, Lead ou Organization pelo e-mail do remetente */
async function matchEmailToEntity(
  email: string,
  ownerId: string
): Promise<{ contactId?: string; leadId?: string; organizationId?: string }> {
  // Prioridade: Contact > LeadContact (→ Lead pai) > Lead (e-mail geral) > Organization

  const contact = await prisma.contact.findFirst({
    where: { email, ownerId },
    select: { id: true },
  });
  if (contact) return { contactId: contact.id };

  // E-mail de um contato específico do lead — vincula ao lead pai
  const leadContact = await prisma.leadContact.findFirst({
    where: { email, lead: { ownerId } },
    select: { leadId: true },
  });
  if (leadContact) return { leadId: leadContact.leadId };

  const lead = await prisma.lead.findFirst({
    where: { email, ownerId },
    select: { id: true },
  });
  if (lead) return { leadId: lead.id };

  const org = await prisma.organization.findFirst({
    where: { email, ownerId },
    select: { id: true },
  });
  if (org) return { organizationId: org.id };

  return {};
}

/**
 * Processa um e-mail recebido: garante idempotência via emailMessageId,
 * busca entidade pelo remetente e cria Activity do tipo "email".
 */
export async function processIncomingEmail(
  email: IncomingEmail,
  ownerId: string
): Promise<void> {
  // 1. Idempotência — verificar se já foi processado
  const existing = await prisma.activity.findUnique({
    where: { emailMessageId: email.messageId },
    select: { id: true, emailFromAddress: true },
  });
  if (existing) {
    // Se a activity existe mas foi criada como e-mail enviado (sem emailFromAddress),
    // atualizar com os dados do remetente para ativar o badge "aguardando resposta"
    if (!existing.emailFromAddress && email.from) {
      await prisma.activity.update({
        where: { id: existing.id },
        data: {
          emailFromAddress: email.from,
          emailFromName: email.fromName,
          emailReplied: false,
        },
      });
      log.info("Activity atualizada com remetente do e-mail recebido", {
        messageId: email.messageId,
        from: email.from,
      });
    } else {
      log.debug("E-mail já processado, ignorando", { messageId: email.messageId });
    }
    return;
  }

  // 2. Buscar entidade pelo e-mail do remetente
  let match: { contactId?: string; leadId?: string; organizationId?: string } = {};
  try {
    match = await matchEmailToEntity(email.from, ownerId);
  } catch (err) {
    log.warn("Falha ao buscar entidade pelo e-mail, continuando sem vínculo", {
      from: email.from,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 3. Preview do corpo (primeiros 500 chars)
  const bodyPreview = email.body.trim().slice(0, 500);

  // 4. Criar Activity
  await prisma.activity.create({
    data: {
      type: "email",
      subject: email.subject || "(sem assunto)",
      description: bodyPreview,
      emailMessageId: email.messageId,
      emailThreadId: email.threadId,
      emailSubject: email.subject,
      emailFromAddress: email.from,
      emailFromName: email.fromName,
      emailReplied: false,
      completed: true,
      completedAt: email.receivedAt,
      dueDate: email.receivedAt,
      ownerId,
      ...(match.contactId ? { contactId: match.contactId } : {}),
      ...(match.leadId ? { leadId: match.leadId } : {}),
      ...(match.organizationId ? { organizationId: match.organizationId } : {}),
    },
  });

  log.info("Activity criada para e-mail recebido", {
    messageId: email.messageId,
    from: email.from,
    entityType: match.contactId ? "contact" : match.leadId ? "lead" : match.organizationId ? "organization" : "none",
  });
}
