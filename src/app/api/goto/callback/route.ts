import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/goto/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "goto-callback" });

// Fase 4 irá implementar o armazenamento dos tokens no banco
// e a criação do Notification Channel via setup automático.
// Por ora, apenas troca o code por tokens e loga.

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    log.warn("GoTo OAuth callback: erro de autorização", { error });
    return NextResponse.redirect(
      new URL("/dashboard/admin?goto_error=" + encodeURIComponent(error), req.url)
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    log.info("GoTo OAuth: tokens obtidos com sucesso", {
      accountKey: tokens.accountKey,
      expiresAt: new Date(tokens.expiresAt).toISOString(),
    });

    // TODO Fase 4: salvar tokens no banco e criar Notification Channel
    return NextResponse.redirect(
      new URL("/dashboard/admin?goto_connected=1", req.url)
    );
  } catch (err) {
    log.error("GoTo OAuth callback: falha na troca de tokens", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(
      new URL("/dashboard/admin?goto_error=token_exchange_failed", req.url)
    );
  }
}
