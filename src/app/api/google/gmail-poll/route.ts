import { NextRequest, NextResponse } from "next/server";
import { isInternalRequest, getSessionOrInternal } from "@/lib/internal-auth";
import { getStoredToken, updateHistoryId } from "@/lib/google/token-store";
import { pollNewEmails } from "@/lib/google/gmail-poller";
import { processIncomingEmail } from "@/lib/google/email-activity-creator";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "gmail-poll-endpoint" });

/**
 * GET /api/google/gmail-poll
 *
 * Endpoint interno para polling de e-mails recebidos.
 * Protegido por INTERNAL_API_KEY ou sessão admin.
 * Chamado pelo cron a cada 5 minutos.
 */
export async function GET(req: NextRequest) {
  if (!isInternalRequest(req)) {
    const auth = await getSessionOrInternal(req);
    if (!auth || auth.user.role !== "admin") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  }

  const token = await getStoredToken();

  if (!token) {
    return NextResponse.json(
      { error: "Conta Google não conectada" },
      { status: 400 }
    );
  }

  // Se não há historyId salvo, inicializar com historyId atual (sem processar passado)
  if (!token.gmailHistoryId) {
    log.info("Primeiro poll: inicializando historyId sem processar e-mails anteriores");

    // Faz um poll vazio apenas para obter o historyId atual
    const { newHistoryId } = await pollNewEmails("1");
    await updateHistoryId(newHistoryId);

    return NextResponse.json({
      processed: 0,
      message: "historyId inicializado — próximo poll processará novos e-mails",
      newHistoryId,
    });
  }

  try {
    const { emails, newHistoryId } = await pollNewEmails(token.gmailHistoryId);

    let processed = 0;

    // Buscar o ownerId do admin para vincular as Activities
    const { prisma } = await import("@/lib/prisma");
    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Nenhum admin encontrado" }, { status: 500 });
    }

    for (const email of emails) {
      try {
        await processIncomingEmail(email, adminUser.id);
        processed++;
      } catch (err) {
        log.error("Falha ao processar e-mail recebido", {
          messageId: email.messageId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Persistir novo historyId para o próximo poll
    await updateHistoryId(newHistoryId);

    log.info("Poll Gmail concluído", { processed, newHistoryId });

    return NextResponse.json({ processed, newHistoryId });
  } catch (err) {
    log.error("Falha no poll Gmail", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Falha no poll Gmail" }, { status: 500 });
  }
}
