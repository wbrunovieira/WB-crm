import { GoToApiPort, GoToCallReport } from "@/domain/integrations/goto/application/ports/goto-api.port";

export class FakeGoToApiPort extends GoToApiPort {
  public callReports: Map<string, GoToCallReport> = new Map();
  public reportsSince: GoToCallReport[] = [];
  public fetchCallReportCalls: Array<{ conversationSpaceId: string; accessToken: string }> = [];
  public shouldFail = false;

  addReport(report: GoToCallReport): void {
    this.callReports.set(report.conversationSpaceId, report);
  }

  async fetchCallReport(conversationSpaceId: string, accessToken: string): Promise<GoToCallReport | null> {
    this.fetchCallReportCalls.push({ conversationSpaceId, accessToken });
    if (this.shouldFail) return null;
    return this.callReports.get(conversationSpaceId) ?? null;
  }

  async fetchReportsSince(_accessToken: string, _since: string): Promise<GoToCallReport[]> {
    return this.reportsSince;
  }

  async refreshToken(_refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
    return {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: Date.now() + 3600 * 1000,
    };
  }
}
