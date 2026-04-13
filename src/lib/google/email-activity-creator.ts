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

type MatchEntityResult = {
  contactId?: string;
  leadId?: string;
  organizationId?: string;
  inOperations?: boolean;
};

/** Busca Contact, Lead ou Organization pelo e-mail do remetente */
async function matchEmailToEntity(
  email: string,
  ownerId: string
): Promise<MatchEntityResult> {
  // Prioridade: Contact > LeadContact (→ Lead pai) > Lead (e-mail geral) > Organization

  const contact = await prisma.contact.findFirst({
    where: { email, ownerId },
    select: { id: true, organization: { select: { inOperationsAt: true } } },
  });
  if (contact) {
    const inOperations = !!contact.organization?.inOperationsAt;
    return { contactId: contact.id, inOperations };
  }

  // E-mail de um contato específico do lead — vincula ao lead pai
  const leadContact = await prisma.leadContact.findFirst({
    where: { email, lead: { ownerId } },
    select: { leadId: true, lead: { select: { inOperationsAt: true } } },
  });
  if (leadContact) {
    const inOperations = !!leadContact.lead?.inOperationsAt;
    return { leadId: leadContact.leadId, inOperations };
  }

  const lead = await prisma.lead.findFirst({
    where: { email, ownerId },
    select: { id: true, inOperationsAt: true },
  });
  if (lead) {
    return { leadId: lead.id, inOperations: !!lead.inOperationsAt };
  }

  const org = await prisma.organization.findFirst({
    where: { email, ownerId },
    select: { id: true, inOperationsAt: true },
  });
  if (org) {
    return { organizationId: org.id, inOperations: !!org.inOperationsAt };
  }

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
  let match: MatchEntityResult = {};
  try {
    match = await matchEmailToEntity(email.from, ownerId);
  } catch (err) {
    log.warn("Falha ao buscar entidade pelo e-mail, continuando sem vínculo", {
      from: email.from,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Se entidade está em operações, não criar atividade automaticamente
  if (match.inOperations) {
    log.info("Entidade em operações — e-mail ignorado", {
      messageId: email.messageId,
      from: email.from,
    });
    return;
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
