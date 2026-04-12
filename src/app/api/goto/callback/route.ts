import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { exchangeCodeForTokens } from "@/lib/goto/auth";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "goto-callback" });

function persistTokensToEnv(tokens: {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}) {
  try {
    const envPath = process.env.ENV_FILE_PATH ?? "/opt/wb-crm/.env";
    const escapeForSed = (s: string) => s.replace(/[&/\\]/g, "\\$&").replace(/"/g, '\\"');
    execSync(
      [
        `sed -i 's|^GOTO_ACCESS_TOKEN=.*|GOTO_ACCESS_TOKEN="${escapeForSed(tokens.accessToken)}"|' ${envPath}`,
        tokens.refreshToken ? `sed -i 's|^GOTO_REFRESH_TOKEN=.*|GOTO_REFRESH_TOKEN="${escapeForSed(tokens.refreshToken)}"|' ${envPath}` : "true",
        `sed -i 's|^GOTO_TOKEN_EXPIRES_AT=.*|GOTO_TOKEN_EXPIRES_AT="${tokens.expiresAt}"|' ${envPath}`,
      ].join(" && ")
    );
    process.env.GOTO_ACCESS_TOKEN = tokens.accessToken;
    process.env.GOTO_REFRESH_TOKEN = tokens.refreshToken;
    process.env.GOTO_TOKEN_EXPIRES_AT = String(tokens.expiresAt);
    log.info("GoTo tokens persistidos no .env com sucesso");
  } catch (err) {
    log.warn("Não foi possível persistir tokens no .env", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  if (error) {
    log.warn("GoTo OAuth callback: erro de autorização", { error });
    return NextResponse.redirect(
      `${baseUrl}/dashboard/admin?goto_error=${encodeURIComponent(error)}`
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

    persistTokensToEnv(tokens);

    return NextResponse.redirect(`${baseUrl}/dashboard/admin?goto_connected=1`);
  } catch (err) {
    log.error("GoTo OAuth callback: falha na troca de tokens", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(
      `${baseUrl}/dashboard/admin?goto_error=token_exchange_failed`
    );
  }
}
