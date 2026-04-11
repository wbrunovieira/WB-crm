import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOAuth2Client, fetchGoogleEmail, SCOPES } from "@/lib/google/auth";
import { saveToken } from "@/lib/google/token-store";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "google-callback" });

/** Base URL para redirects — usa NEXTAUTH_URL para funcionar atrás de proxy (Nginx) */
function baseUrl(): string {
  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

function redirect(path: string) {
  return NextResponse.redirect(new URL(path, baseUrl()));
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role?.toLowerCase() !== "admin") {
    return redirect("/admin?error=unauthorized");
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    log.warn("Usuário recusou consentimento Google", { error });
    return redirect("/admin/google?error=consent_denied");
  }

  if (!code) {
    return redirect("/admin/google?error=no_code");
  }

  try {
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    const email = await fetchGoogleEmail(tokens.access_token!, client);

    await saveToken({
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
      scope: tokens.scope ?? SCOPES.join(" "),
      email,
    });

    log.info("Conta Google conectada com sucesso", { email });
    return redirect("/admin/google?success=true");
  } catch (err) {
    log.error("Falha ao conectar conta Google", {
      error: err instanceof Error ? err.message : String(err),
    });
    return redirect("/admin/google?error=token_exchange");
  }
}
