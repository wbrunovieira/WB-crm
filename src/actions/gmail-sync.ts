"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStoredToken, updateHistoryId } from "@/lib/google/token-store";
import { getAuthenticatedClient } from "@/lib/google/auth";
import { pollNewEmails } from "@/lib/google/gmail-poller";
import { processIncomingEmail } from "@/lib/google/email-activity-creator";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "gmail-sync-action" });

export interface GmailSyncResult {
  success: boolean;
  processed?: number;
  error?: string;
}

export async function syncGmailNow(revalidateUrl?: string): Promise<GmailSyncResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Não autorizado" };
    }

    const token = await getStoredToken();
    if (!token) {
      return { success: false, error: "Conta Google não conectada" };
    }

    // Primeiro poll: inicializar historyId
    if (!token.gmailHistoryId) {
      const auth = await getAuthenticatedClient();
      const gmail = google.gmail({ version: "v1", auth });
      const profile = await gmail.users.getProfile({ userId: "me" });
      await updateHistoryId(profile.data.historyId!);
      if (revalidateUrl) revalidatePath(revalidateUrl);
      return { success: true, processed: 0 };
    }

    const { emails, newHistoryId } = await pollNewEmails(token.gmailHistoryId);

    const adminUser = await prisma.user.findFirst({
      where: { role: "admin" },
      select: { id: true },
    });

    if (!adminUser) {
      return { success: false, error: "Admin não encontrado" };
    }

    let processed = 0;
    for (const email of emails) {
      try {
        await processIncomingEmail(email, adminUser.id);
        processed++;
      } catch (err) {
        log.error("Falha ao processar e-mail durante sync manual", {
          messageId: email.messageId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    await updateHistoryId(newHistoryId);

    if (revalidateUrl) revalidatePath(revalidateUrl);

    log.info("Sync manual Gmail concluído", { processed });

    return { success: true, processed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Erro no sync manual Gmail", { error: message });
    return { success: false, error: message };
  }
}
