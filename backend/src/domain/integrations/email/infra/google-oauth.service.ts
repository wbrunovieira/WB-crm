import { Injectable, Logger } from "@nestjs/common";
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
      },
    });

    return newAccessToken;
  }
}
