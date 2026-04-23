import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GoToTokenService } from "@/domain/integrations/goto/infra/goto-token.service";
import { FakeGoToApiPort } from "../fakes/fake-goto-api.port";

let goToApi: FakeGoToApiPort;
let service: GoToTokenService;

const originalEnv = { ...process.env };

beforeEach(() => {
  goToApi = new FakeGoToApiPort();
  service = new GoToTokenService(goToApi);

  // Reset env vars before each test
  delete process.env.GOTO_ACCESS_TOKEN;
  delete process.env.GOTO_REFRESH_TOKEN;
  delete process.env.GOTO_TOKEN_EXPIRES_AT;
});

afterEach(() => {
  // Restore original env
  Object.assign(process.env, originalEnv);
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) delete process.env[key];
  });
});

describe("GoToTokenService", () => {
  it("throws when no token configured", async () => {
    await expect(service.getValidAccessToken()).rejects.toThrow(
      /GoTo token not configured/,
    );
  });

  it("returns valid access token from env when not expired", async () => {
    process.env.GOTO_ACCESS_TOKEN = "valid-access-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() + 60 * 60 * 1000); // 1h from now

    const token = await service.getValidAccessToken();

    expect(token).toBe("valid-access-token");
    expect(goToApi.fetchCallReportCalls).toHaveLength(0); // no refresh needed
  });

  it("refreshes when access token is expired and refresh token exists", async () => {
    process.env.GOTO_REFRESH_TOKEN = "valid-refresh-token";
    process.env.GOTO_ACCESS_TOKEN = "expired-access-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000); // already expired

    const token = await service.getValidAccessToken();

    expect(token).toBe("new-access-token"); // from FakeGoToApiPort.refreshToken
    expect(process.env.GOTO_ACCESS_TOKEN).toBe("new-access-token");
    expect(process.env.GOTO_REFRESH_TOKEN).toBe("new-refresh-token");
  });

  it("refreshes when no access token but refresh token present", async () => {
    process.env.GOTO_REFRESH_TOKEN = "valid-refresh-token";

    const token = await service.getValidAccessToken();

    expect(token).toBe("new-access-token");
  });

  it("throws when access token expired and no refresh token", async () => {
    process.env.GOTO_ACCESS_TOKEN = "expired-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);
    // no GOTO_REFRESH_TOKEN

    await expect(service.getValidAccessToken()).rejects.toThrow(
      /no refresh token available/,
    );
  });

  it("persists refreshed tokens to process.env", async () => {
    process.env.GOTO_REFRESH_TOKEN = "old-refresh";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    await service.getValidAccessToken();

    expect(process.env.GOTO_ACCESS_TOKEN).toBe("new-access-token");
    expect(process.env.GOTO_REFRESH_TOKEN).toBe("new-refresh-token");
    expect(Number(process.env.GOTO_TOKEN_EXPIRES_AT)).toBeGreaterThan(Date.now());
  });
});
