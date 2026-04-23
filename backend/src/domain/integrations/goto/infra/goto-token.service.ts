import { Injectable, Logger } from "@nestjs/common";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { GoToApiPort } from "@/domain/integrations/goto/application/ports/goto-api.port";

const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

@Injectable()
export class GoToTokenService extends GoToTokenPort {
  private readonly logger = new Logger(GoToTokenService.name);

  constructor(private readonly goToApi: GoToApiPort) {
    super();
  }

  async getValidAccessToken(): Promise<string> {
    const accessToken = process.env.GOTO_ACCESS_TOKEN;
    const refreshToken = process.env.GOTO_REFRESH_TOKEN;
    const expiresAt = parseInt(process.env.GOTO_TOKEN_EXPIRES_AT ?? "0", 10);

    if (!accessToken && !refreshToken) {
      throw new Error("GoTo token not configured. Please re-authorize via /auth/goto.");
    }

    if (accessToken && expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
      return accessToken;
    }

    if (!refreshToken) {
      throw new Error("GoTo access token expired and no refresh token available. Please re-authorize via /auth/goto.");
    }

    this.logger.log("GoTo access token expiring — refreshing via refresh token");

    const newTokens = await this.goToApi.refreshToken(refreshToken);

    process.env.GOTO_ACCESS_TOKEN = newTokens.accessToken;
    process.env.GOTO_REFRESH_TOKEN = newTokens.refreshToken;
    process.env.GOTO_TOKEN_EXPIRES_AT = String(newTokens.expiresAt);

    this.logger.log("GoTo tokens refreshed");

    return newTokens.accessToken;
  }
}
