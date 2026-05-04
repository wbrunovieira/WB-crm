import { Injectable, Logger } from "@nestjs/common";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { GoToApiPort } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { OAuthRepository } from "@/domain/auth/application/repositories/oauth.repository";

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

@Injectable()
export class GoToTokenService extends GoToTokenPort {
  private readonly logger = new Logger(GoToTokenService.name);

  // In-process lock: only one refresh runs at a time
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly goToApi: GoToApiPort,
    private readonly oauthRepo: OAuthRepository,
  ) {
    super();
  }

  async getValidAccessToken(): Promise<string> {
    // DB-first: load persisted tokens and merge with env
    const dbTokens = await this.oauthRepo.loadGoToTokens();
    if (dbTokens) {
      const dbExpiresAt = dbTokens.expiresAt;
      const envExpiresAt = parseInt(process.env.GOTO_TOKEN_EXPIRES_AT ?? "0", 10);
      // Use DB access token when it's fresher
      if (dbExpiresAt > envExpiresAt) {
        process.env.GOTO_ACCESS_TOKEN = dbTokens.accessToken;
        process.env.GOTO_TOKEN_EXPIRES_AT = String(dbExpiresAt);
      }
      // Always pull refresh token from DB if env doesn't have one
      if (dbTokens.refreshToken && !process.env.GOTO_REFRESH_TOKEN) {
        process.env.GOTO_REFRESH_TOKEN = dbTokens.refreshToken;
      }
    }

    const accessToken = process.env.GOTO_ACCESS_TOKEN;
    const expiresAt = parseInt(process.env.GOTO_TOKEN_EXPIRES_AT ?? "0", 10);

    // Fast path: token still valid
    if (accessToken && expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
      return accessToken;
    }

    const refreshToken = process.env.GOTO_REFRESH_TOKEN;

    if (!accessToken && !refreshToken) {
      throw new Error("GoTo token not configured. Please re-authorize via /auth/goto.");
    }

    if (!refreshToken) {
      throw new Error("GoTo access token expired and no refresh token available. Please re-authorize via /auth/goto.");
    }

    // In-process lock: reuse the in-flight refresh if one is already running
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.doRefresh(refreshToken).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async doRefresh(refreshToken: string): Promise<string> {
    try {
      const newTokens = await this.goToApi.refreshToken(refreshToken);
      await this.persist(newTokens);
      this.logger.log("GoTo tokens refreshed and persisted");
      return newTokens.accessToken;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isRevoked = msg.includes("refresh.token.revoked");

      if (isRevoked) {
        // Re-read from DB — another process may have already rotated the token
        const dbTokens = await this.oauthRepo.loadGoToTokens();
        if (
          dbTokens &&
          dbTokens.refreshToken &&
          dbTokens.refreshToken !== refreshToken &&
          dbTokens.expiresAt > Date.now() + EXPIRY_BUFFER_MS
        ) {
          // DB has a fresher valid token — recover without re-auth
          await this.persist(dbTokens);
          this.logger.log("GoTo refresh token was revoked — recovered from DB");
          return dbTokens.accessToken;
        }

        throw new Error(
          "GoTo refresh token revogado. Acesse /auth/goto para re-autorizar a integração.",
        );
      }

      throw err;
    }
  }

  private async persist(tokens: { accessToken: string; refreshToken?: string; expiresAt: number }): Promise<void> {
    process.env.GOTO_ACCESS_TOKEN = tokens.accessToken;
    if (tokens.refreshToken) process.env.GOTO_REFRESH_TOKEN = tokens.refreshToken;
    process.env.GOTO_TOKEN_EXPIRES_AT = String(tokens.expiresAt);

    await this.oauthRepo.storeGoToTokens(tokens);
  }
}
