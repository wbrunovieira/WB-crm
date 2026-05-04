import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GoToTokenService } from "@/domain/integrations/goto/infra/goto-token.service";
import { FakeGoToApiPort } from "../fakes/fake-goto-api.port";
import { OAuthRepository, type GoToTokenRecord } from "@/domain/auth/application/repositories/oauth.repository";

class FakeOAuthRepository extends OAuthRepository {
  public stored: GoToTokenRecord | null = null;
  public storeGoToTokensCalls: GoToTokenRecord[] = [];

  async storeGoToTokens(tokens: GoToTokenRecord): Promise<void> {
    this.stored = tokens;
    this.storeGoToTokensCalls.push(tokens);
  }

  async loadGoToTokens(): Promise<GoToTokenRecord | null> {
    return this.stored;
  }

  async storeGoogleTokens(): Promise<void> {}
  async deleteAllGoogleTokens(): Promise<void> {}
}

class RevokingFakeGoToApiPort extends FakeGoToApiPort {
  public refreshCallCount = 0;
  public shouldRevokeOnFirstCall = false;
  public tokensAfterRevoke: GoToTokenRecord | null = null;

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: number }> {
    this.refreshCallCount++;
    if (this.shouldRevokeOnFirstCall && this.refreshCallCount === 1) {
      throw new Error('GoTo token refresh failed: 400 {"error":"invalid_grant","error_description":"refresh.token.revoked"}');
    }
    return {
      accessToken: "new-access-token",
      refreshToken: "new-refresh-token",
      expiresAt: Date.now() + 3600 * 1000,
    };
  }
}

let goToApi: FakeGoToApiPort;
let fakeOAuth: FakeOAuthRepository;
let service: GoToTokenService;

const originalEnv = { ...process.env };

beforeEach(() => {
  goToApi = new FakeGoToApiPort();
  fakeOAuth = new FakeOAuthRepository();
  service = new GoToTokenService(goToApi, fakeOAuth);

  delete process.env.GOTO_ACCESS_TOKEN;
  delete process.env.GOTO_REFRESH_TOKEN;
  delete process.env.GOTO_TOKEN_EXPIRES_AT;
});

afterEach(() => {
  Object.assign(process.env, originalEnv);
  Object.keys(process.env).forEach((key) => {
    if (!(key in originalEnv)) delete process.env[key];
  });
});

describe("GoToTokenService", () => {

  // ── Comportamentos existentes ────────────────────────────────────────────

  it("lança erro quando nenhum token configurado (nem env nem DB)", async () => {
    await expect(service.getValidAccessToken()).rejects.toThrow(/GoTo token not configured/);
  });

  it("retorna token válido do env quando ainda não expirou", async () => {
    process.env.GOTO_ACCESS_TOKEN = "valid-access-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() + 60 * 60 * 1000);

    const token = await service.getValidAccessToken();

    expect(token).toBe("valid-access-token");
    expect(goToApi.fetchCallReportCalls).toHaveLength(0);
  });

  it("faz refresh quando access token expirou e há refresh token no env", async () => {
    process.env.GOTO_REFRESH_TOKEN = "valid-refresh-token";
    process.env.GOTO_ACCESS_TOKEN = "expired-access-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    const token = await service.getValidAccessToken();

    expect(token).toBe("new-access-token");
    expect(process.env.GOTO_ACCESS_TOKEN).toBe("new-access-token");
    expect(process.env.GOTO_REFRESH_TOKEN).toBe("new-refresh-token");
  });

  it("faz refresh quando não há access token mas há refresh token no env", async () => {
    process.env.GOTO_REFRESH_TOKEN = "valid-refresh-token";

    const token = await service.getValidAccessToken();

    expect(token).toBe("new-access-token");
  });

  it("lança erro quando access token expirou e não há refresh token", async () => {
    process.env.GOTO_ACCESS_TOKEN = "expired-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    await expect(service.getValidAccessToken()).rejects.toThrow(/no refresh token available/);
  });

  it("persiste tokens renovados no process.env", async () => {
    process.env.GOTO_REFRESH_TOKEN = "old-refresh";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    await service.getValidAccessToken();

    expect(process.env.GOTO_ACCESS_TOKEN).toBe("new-access-token");
    expect(process.env.GOTO_REFRESH_TOKEN).toBe("new-refresh-token");
    expect(Number(process.env.GOTO_TOKEN_EXPIRES_AT)).toBeGreaterThan(Date.now());
  });

  it("persiste tokens renovados no OAuthRepository", async () => {
    process.env.GOTO_REFRESH_TOKEN = "old-refresh";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    await service.getValidAccessToken();

    expect(fakeOAuth.storeGoToTokensCalls).toHaveLength(1);
    expect(fakeOAuth.storeGoToTokensCalls[0].accessToken).toBe("new-access-token");
    expect(fakeOAuth.storeGoToTokensCalls[0].refreshToken).toBe("new-refresh-token");
    expect(fakeOAuth.storeGoToTokensCalls[0].expiresAt).toBeGreaterThan(Date.now());
  });

  it("não chama OAuthRepository quando token ainda é válido", async () => {
    process.env.GOTO_ACCESS_TOKEN = "valid-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() + 60 * 60 * 1000);

    await service.getValidAccessToken();

    expect(fakeOAuth.storeGoToTokensCalls).toHaveLength(0);
  });

  // ── Novo: leitura do banco (DB-first) ────────────────────────────────────

  it("usa tokens do DB quando env está vazio", async () => {
    fakeOAuth.stored = {
      accessToken: "db-access-token",
      refreshToken: "db-refresh-token",
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    const token = await service.getValidAccessToken();

    expect(token).toBe("db-access-token");
  });

  it("prefere token do DB quando mais recente que o env", async () => {
    process.env.GOTO_ACCESS_TOKEN = "old-env-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000); // env expirado

    fakeOAuth.stored = {
      accessToken: "fresh-db-token",
      refreshToken: "fresh-db-refresh",
      expiresAt: Date.now() + 60 * 60 * 1000, // DB válido
    };

    const token = await service.getValidAccessToken();

    expect(token).toBe("fresh-db-token");
  });

  it("usa refresh token do DB quando env não tem refresh token", async () => {
    process.env.GOTO_ACCESS_TOKEN = "expired-env-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);
    // sem GOTO_REFRESH_TOKEN no env

    fakeOAuth.stored = {
      accessToken: "expired-db-token",
      refreshToken: "db-refresh-token",
      expiresAt: Date.now() - 1000, // DB também expirado
    };

    const token = await service.getValidAccessToken();

    // deve fazer refresh usando o refresh token do DB
    expect(token).toBe("new-access-token");
  });

  // ── Novo: lock in-process (sem refreshes concorrentes) ───────────────────

  it("chamadas concorrentes disparam apenas um refresh", async () => {
    let refreshCount = 0;
    const slowGoToApi = new FakeGoToApiPort();
    const originalRefresh = slowGoToApi.refreshToken.bind(slowGoToApi);
    slowGoToApi.refreshToken = async (rt: string) => {
      refreshCount++;
      await new Promise((r) => setTimeout(r, 10)); // simula latência
      return originalRefresh(rt);
    };

    process.env.GOTO_REFRESH_TOKEN = "shared-refresh-token";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    const svc = new GoToTokenService(slowGoToApi, fakeOAuth);

    const [t1, t2, t3] = await Promise.all([
      svc.getValidAccessToken(),
      svc.getValidAccessToken(),
      svc.getValidAccessToken(),
    ]);

    expect(refreshCount).toBe(1); // só um refresh real
    expect(t1).toBe("new-access-token");
    expect(t2).toBe("new-access-token");
    expect(t3).toBe("new-access-token");
  });

  // ── Novo: recuperação automática após revoked ─────────────────────────────

  it("quando refresh falha com revoked e DB tem token mais novo, usa o do DB", async () => {
    const revokingApi = new RevokingFakeGoToApiPort();
    revokingApi.shouldRevokeOnFirstCall = true;

    process.env.GOTO_REFRESH_TOKEN = "old-revoked-refresh";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    // Simula que outro processo já renovou o token no DB
    fakeOAuth.stored = {
      accessToken: "already-refreshed-by-db",
      refreshToken: "rotated-refresh-token",
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    const svc = new GoToTokenService(revokingApi, fakeOAuth);
    const token = await svc.getValidAccessToken();

    // Deve recuperar do DB em vez de lançar erro
    expect(token).toBe("already-refreshed-by-db");
  });

  it("quando refresh falha com revoked e DB não tem token mais novo, lança erro claro", async () => {
    const revokingApi = new RevokingFakeGoToApiPort();
    revokingApi.shouldRevokeOnFirstCall = true;

    process.env.GOTO_REFRESH_TOKEN = "old-revoked-refresh";
    process.env.GOTO_TOKEN_EXPIRES_AT = String(Date.now() - 1000);

    // DB tem o mesmo token revogado
    fakeOAuth.stored = {
      accessToken: "same-expired-token",
      refreshToken: "old-revoked-refresh", // mesmo RT revogado
      expiresAt: Date.now() - 1000,
    };

    const svc = new GoToTokenService(revokingApi, fakeOAuth);

    await expect(svc.getValidAccessToken()).rejects.toThrow(
      /GoTo refresh token revogado.*re-autori/i,
    );
  });
});
