import { Injectable } from "@nestjs/common";
import { readFileSync, writeFileSync } from "fs";
import { PrismaService } from "@/infra/database/prisma.service";
import { OAuthRepository, type GoogleTokenInput, type GoToTokenRecord } from "@/domain/auth/application/repositories/oauth.repository";

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

  async loadGoToTokens(): Promise<GoToTokenRecord | null> {
    try {
      const row = await this.prisma.integrationToken.findUnique({
        where: { provider: "goto" },
      });
      if (!row) return null;
      return {
        accessToken: row.accessToken,
        refreshToken: row.refreshToken ?? undefined,
        expiresAt: row.expiresAt.getTime(),
      };
    } catch {
      return null;
    }
  }

  async storeGoToTokens(tokens: GoToTokenRecord): Promise<void> {
    // Primary: persist to PostgreSQL (reliable, survives container restarts)
    try {
      await this.prisma.integrationToken.upsert({
        where: { provider: "goto" },
        create: {
          provider: "goto",
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          expiresAt: new Date(tokens.expiresAt),
        },
        update: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken ?? null,
          expiresAt: new Date(tokens.expiresAt),
        },
      });
    } catch { /* non-fatal — env already updated above */ }

    // Update process.env for immediate in-process use
    process.env.GOTO_ACCESS_TOKEN = tokens.accessToken;
    if (tokens.refreshToken) process.env.GOTO_REFRESH_TOKEN = tokens.refreshToken;
    process.env.GOTO_TOKEN_EXPIRES_AT = String(tokens.expiresAt);

    // Secondary: persist to mounted .env file as fallback
    try {
      const envPath = process.env.ENV_FILE_PATH ?? "/opt/wb-crm/.env";
      let content = readFileSync(envPath, "utf8");
      const replace = (key: string, value: string) => {
        const regex = new RegExp(`^${key}=.*`, "m");
        return regex.test(content)
          ? content.replace(regex, `${key}=${value}`)
          : content + `\n${key}=${value}`;
      };
      content = replace("GOTO_ACCESS_TOKEN", tokens.accessToken);
      if (tokens.refreshToken) content = replace("GOTO_REFRESH_TOKEN", tokens.refreshToken);
      content = replace("GOTO_TOKEN_EXPIRES_AT", String(tokens.expiresAt));
      writeFileSync(envPath, content, "utf8");
    } catch { /* non-fatal — DB already has the tokens */ }
  }
}
