import { Injectable } from "@nestjs/common";
import { execSync } from "child_process";
import { PrismaService } from "@/infra/database/prisma.service";
import { OAuthRepository, type GoogleTokenInput } from "@/domain/auth/application/repositories/oauth.repository";

@Injectable()
export class PrismaOAuthRepository extends OAuthRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async storeGoogleTokens(input: GoogleTokenInput): Promise<void> {
    await this.prisma.googleToken.upsert({
      where: { id: input.email },
      create: {
        id: input.email,
        email: input.email,
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
        scope: input.scope,
      },
      update: {
        accessToken: input.accessToken,
        refreshToken: input.refreshToken,
        expiresAt: input.expiresAt,
      },
    });
  }

  async deleteAllGoogleTokens(): Promise<void> {
    await this.prisma.googleToken.deleteMany();
  }

  async storeGoToTokens(tokens: { accessToken: string; refreshToken?: string; expiresAt: number }): Promise<void> {
    // Persist to .env file for process restart persistence (same approach as Next.js layer)
    try {
      const envPath = process.env.ENV_FILE_PATH ?? "/opt/wb-crm/.env";
      const esc = (s: string) => s.replace(/[&/\\]/g, "\\$&").replace(/"/g, '\\"');
      const cmds = [
        `sed -i 's|^GOTO_ACCESS_TOKEN=.*|GOTO_ACCESS_TOKEN="${esc(tokens.accessToken)}"|' ${envPath}`,
        tokens.refreshToken ? `sed -i 's|^GOTO_REFRESH_TOKEN=.*|GOTO_REFRESH_TOKEN="${esc(tokens.refreshToken)}"|' ${envPath}` : null,
        `sed -i 's|^GOTO_TOKEN_EXPIRES_AT=.*|GOTO_TOKEN_EXPIRES_AT="${tokens.expiresAt}"|' ${envPath}`,
      ].filter(Boolean).join(" && ");
      execSync(cmds);
    } catch { /* non-fatal */ }
    process.env.GOTO_ACCESS_TOKEN = tokens.accessToken;
    if (tokens.refreshToken) process.env.GOTO_REFRESH_TOKEN = tokens.refreshToken;
    process.env.GOTO_TOKEN_EXPIRES_AT = String(tokens.expiresAt);
  }
}
