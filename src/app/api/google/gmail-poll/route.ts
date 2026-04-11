import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { isInternalRequest, getSessionOrInternal } from "@/lib/internal-auth";
import { getStoredToken, updateHistoryId } from "@/lib/google/token-store";
import { getAuthenticatedClient } from "@/lib/google/auth";
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

  // Primeiro poll: buscar historyId atual via getProfile (historyId=1 é inválido na API)
  if (!token.gmailHistoryId) {
    log.info("Primeiro poll: obtendo historyId atual via getProfile");

    try {
      const auth = await getAuthenticatedClient();
      const gmail = google.gmail({ version: "v1", auth });
      const profile = await gmail.users.getProfile({ userId: "me" });
      const currentHistoryId = profile.data.historyId!;

      await updateHistoryId(currentHistoryId);

      log.info("historyId inicializado", { currentHistoryId });

      return NextResponse.json({
        processed: 0,
        message: "historyId inicializado — próximo poll processará novos e-mails",
        newHistoryId: currentHistoryId,
      });
    } catch (err) {
      log.error("Falha ao obter historyId inicial", {
        error: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json({ error: "Falha ao inicializar historyId" }, { status: 500 });
    }
  }

  try {
    const { emails, newHistoryId } = await pollNewEmails(token.gmailHistoryId);

    let processed = 0;

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
