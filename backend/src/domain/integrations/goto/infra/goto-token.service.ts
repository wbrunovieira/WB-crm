import { Injectable, Logger } from "@nestjs/common";
import { GoToTokenPort } from "@/domain/integrations/goto/application/ports/goto-token.port";
import { GoToApiPort } from "@/domain/integrations/goto/application/ports/goto-api.port";
import { PrismaService } from "@/infra/database/prisma.service";

const PROVIDER = "goto";
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

@Injectable()
export class GoToTokenService extends GoToTokenPort {
  private readonly logger = new Logger(GoToTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly goToApi: GoToApiPort,
  ) {
    super();
  }

  async getValidAccessToken(): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = this.prisma as any;
    const token = await db.integrationToken.findUnique({
      where: { provider: PROVIDER },
    }) as { id: string; accessToken: string; refreshToken?: string | null; expiresAt: Date } | null;

    if (!token) {
      throw new Error("GoTo token not found in database. Please re-authorize via OAuth.");
    }

    // Token still valid (with 5min buffer)
    if (token.expiresAt.getTime() > Date.now() + EXPIRY_BUFFER_MS) {
      return token.accessToken;
    }

    if (!token.refreshToken) {
      throw new Error("GoTo access token expired and no refresh token available. Please re-authorize.");
    }

    this.logger.log("GoTo access token expiring — refreshing via refresh token");

    const newTokens = await this.goToApi.refreshToken(token.refreshToken);

    await db.integrationToken.update({
      where: { provider: PROVIDER },
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresAt: new Date(newTokens.expiresAt),
      },
    });

    this.logger.log("GoTo tokens refreshed and persisted to database");

    return newTokens.accessToken;
  }
}
