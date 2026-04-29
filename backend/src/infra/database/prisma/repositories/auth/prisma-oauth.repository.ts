import { Injectable } from "@nestjs/common";
import { readFileSync, writeFileSync } from "fs";
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
    process.env.GOTO_ACCESS_TOKEN = tokens.accessToken;
    if (tokens.refreshToken) process.env.GOTO_REFRESH_TOKEN = tokens.refreshToken;
    process.env.GOTO_TOKEN_EXPIRES_AT = String(tokens.expiresAt);

    // Persist to mounted .env file so tokens survive container restarts
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
    } catch { /* non-fatal — process.env already updated above */ }
  }
}
