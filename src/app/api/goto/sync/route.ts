import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { syncCallReports } from "@/lib/goto/call-report-syncer";
import { getValidAccessToken } from "@/lib/goto/token-manager";

const log = logger.child({ context: "goto-sync" });

function validateSecret(req: NextRequest): boolean {
  const expectedSecret = process.env.GOTO_WEBHOOK_SECRET;
  if (!expectedSecret) return false;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === expectedSecret;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!validateSecret(req)) {
    log.warn("GoTo sync: secret inválido ou ausente");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let accessToken: string;
  try {
    accessToken = await getValidAccessToken();
  } catch (err) {
    log.warn("GoTo sync: falha ao obter access_token", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not obtain GoTo access token" },
      { status: 503 }
    );
  }

  const ownerId = process.env.GOTO_DEFAULT_OWNER_ID;
  if (!ownerId) {
    log.warn("GoTo sync: GOTO_DEFAULT_OWNER_ID não configurado");
    return NextResponse.json(
      { error: "GOTO_DEFAULT_OWNER_ID not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await syncCallReports(accessToken, ownerId);
    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    log.error("GoTo sync: erro ao sincronizar", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
