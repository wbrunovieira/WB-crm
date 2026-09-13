import { Injectable, Logger } from "@nestjs/common";
import { deveAvisar, idadeEmDias, diagnostico } from "./google-token-health";
import { GoogleOAuthPort } from "../application/ports/google-oauth.port";
import { PrismaService } from "@/infra/database/prisma.service";

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class GoogleOAuthService extends GoogleOAuthPort {
  private readonly logger = new Logger(GoogleOAuthService.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getValidToken(userId: string): Promise<string> {
    const token = await this.prisma.googleToken.findFirst({
      where: { id: userId },
      select: {
        id: true,
        accessToken: true,
        refreshToken: true,
        expiresAt: true,
      },
    });

    if (!token) {
      throw new Error(`No Google token found for userId: ${userId}`);
    }

    const now = Date.now();
    const expiresAt = new Date(token.expiresAt).getTime();

    // Auto-refresh if expires within 5 minutes
    if (expiresAt - REFRESH_BUFFER_MS < now) {
      this.logger.log("GoogleOAuthService: refreshing token", { userId });
      return this.refreshToken(token.id, token.refreshToken);
    }

    return token.accessToken;
  }

  async storeTokens(
    userId: string,
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresAt: Date;
    },
  ): Promise<void> {
    await this.prisma.googleToken.upsert({
      where: { id: userId },
      create: {
        id: userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        scope: "https://mail.google.com/",
        email: userId,
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt,
        // Consentimento novo = refresh token novo. connectedAt marca o nascimento dele, que e
        // o que permite medir a idade na proxima falha; updatedAt nao serve porque muda a cada
        // renovacao de access token. O estado de falha e limpo para o proximo aviso valer.
        connectedAt: new Date(),
        lastFailureAt: null,
        lastFailureReason: null,
        failureNotifiedAt: null,
      },
    });
  }

  private async refreshToken(tokenId: string, refreshToken: string): Promise<string> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured for token refresh");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      // Registra ANTES de lancar: em 25/08/2026 a falha existiu 19 dias so em log, o container
      // reiniciou, e a causa ficou indeterminavel. Gravado no banco, sobrevive a restart.
      await this.registrarFalha(tokenId, `${response.status} ${text}`);
      throw new Error(`Token refresh failed: ${response.status} ${text}`);
    }

    const data = await response.json() as {
      access_token: string;
      expires_in: number;
    };

    const newAccessToken = data.access_token;
    const newExpiresAt = new Date(Date.now() + data.expires_in * 1000);

    await this.prisma.googleToken.update({
      where: { id: tokenId },
      data: {
        accessToken: newAccessToken,
        expiresAt: newExpiresAt,
        lastRefreshOkAt: new Date(),
      },
    });

    return newAccessToken;
  }

  /**
   * Guarda a falha no banco com a IDADE do token e uma hipotese de causa.
   *
   * A idade e o diagnostico: ~7 dias sempre significa app em modo "Testing" no Google Cloud,
   * que invalida refresh token semanalmente; meses significa evento unico. Sem isto, a proxima
   * queda vai exigir a mesma investigacao que esta exigiu — e falhou, porque o log do periodo
   * ja nao existia.
   */
  private async registrarFalha(tokenId: string, motivo: string): Promise<void> {
    try {
      const token = await this.prisma.googleToken.findUnique({ where: { id: tokenId } });
      if (!token) return;

      const agora = new Date();
      const idade = idadeEmDias(token.connectedAt ?? null, agora);
      const avisar = deveAvisar({ failureNotifiedAt: token.failureNotifiedAt ?? null });

      await this.prisma.googleToken.update({
        where: { id: tokenId },
        data: {
          lastFailureAt: agora,
          lastFailureReason: `${motivo} | ${diagnostico(idade)}`,
          ...(avisar ? { failureNotifiedAt: agora } : {}),
        },
      });

      if (avisar) {
        this.logger.error(
          `CONEXAO GOOGLE CAIU. ${diagnostico(idade)} Reconectar em /admin/google.`,
        );
      }
    } catch {
      // Diagnostico nunca pode derrubar o fluxo que ele observa.
    }
  }

}
