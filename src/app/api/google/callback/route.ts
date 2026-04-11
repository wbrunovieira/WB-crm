import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOAuth2Client, fetchGoogleEmail, SCOPES } from "@/lib/google/auth";
import { saveToken } from "@/lib/google/token-store";
import { logger } from "@/lib/logger";

const log = logger.child({ context: "google-callback" });

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role?.toLowerCase() !== "admin") {
    return NextResponse.redirect(new URL("/admin?error=unauthorized", req.url));
  }

  const code = req.nextUrl.searchParams.get("code");
  const error = req.nextUrl.searchParams.get("error");

  if (error) {
    log.warn("Usuário recusou consentimento Google", { error });
    return NextResponse.redirect(new URL("/admin/google?error=consent_denied", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/admin/google?error=no_code", req.url));
  }

  try {
    // Troca o code por tokens usando um único cliente (code é de uso único)
    const client = createOAuth2Client();
    const { tokens } = await client.getToken(code);

    // Busca email usando o access_token já obtido (reutiliza o mesmo cliente)
    const email = await fetchGoogleEmail(tokens.access_token!, client);

    // Persiste tudo em uma única operação
    await saveToken({
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
      scope: tokens.scope ?? SCOPES.join(" "),
      email,
    });

    log.info("Conta Google conectada com sucesso", { email });
    return NextResponse.redirect(new URL("/admin/google?success=true", req.url));
  } catch (err) {
    log.error("Falha ao conectar conta Google", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.redirect(new URL("/admin/google?error=token_exchange", req.url));
  }
}
