"use server";

import { backendFetch } from "@/lib/backend/client";
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
    const result = await backendFetch<{ processed: number }>("/email/sync", { method: "POST" });

    if (revalidateUrl) revalidatePath(revalidateUrl);

    log.info("Sync manual Gmail concluído", { processed: result.processed });

    return { success: true, processed: result.processed };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("Erro no sync manual Gmail", { error: message });
    return { success: false, error: message };
  }
}
