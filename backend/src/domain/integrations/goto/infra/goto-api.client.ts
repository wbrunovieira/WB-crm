import { Injectable, Logger } from "@nestjs/common";
import { GoToApiPort, GoToCallReport } from "@/domain/integrations/goto/application/ports/goto-api.port";

const GOTO_API = "https://api.goto.com";
const GOTO_TOKEN_URL = "https://authentication.logmeininc.com/oauth/token";

@Injectable()
export class GoToApiClient extends GoToApiPort {
  private readonly logger = new Logger(GoToApiClient.name);

  async fetchCallReport(
    conversationSpaceId: string,
    accessToken: string,
  ): Promise<GoToCallReport | null> {
    try {
      const res = await fetch(
        `${GOTO_API}/call-events-report/v1/reports/${conversationSpaceId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!res.ok) {
        this.logger.warn(`Failed to fetch GoTo report: ${res.status}`, { conversationSpaceId });
        return null;
      }

      return res.json() as Promise<GoToCallReport>;
    } catch (err) {
      this.logger.error("Error fetching GoTo call report", {
        conversationSpaceId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  async fetchReportsSince(
    accessToken: string,
    since: string,
  ): Promise<GoToCallReport[]> {
    const allReports: GoToCallReport[] = [];
    let nextPageMarker: string | undefined;

    do {
      const params = new URLSearchParams({ startDate: since });
      if (nextPageMarker) params.set("nextPageMarker", nextPageMarker);

      const res = await fetch(
        `${GOTO_API}/call-events-report/v1/reports?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      if (!res.ok) {
        this.logger.warn(`Failed to fetch GoTo reports since ${since}: ${res.status}`);
        break;
      }

      const data = await res.json() as {
        reports?: GoToCallReport[];
        nextPageMarker?: string;
      };

      allReports.push(...(data.reports ?? []));
      nextPageMarker = data.nextPageMarker;
    } while (nextPageMarker);

    return allReports;
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
    const clientId = process.env.GOTO_CLIENT_ID!;
    const clientSecret = process.env.GOTO_CLIENT_SECRET!;
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch(GOTO_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(`GoTo token refresh failed: ${res.status} ${JSON.stringify(error)}`);
    }

    const data = await res.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}
