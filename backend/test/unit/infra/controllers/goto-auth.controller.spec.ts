import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthController } from "@/infra/controllers/auth.controller";
import { LoginUseCase } from "@/domain/auth/application/use-cases/login.use-case";
import { RegisterUserUseCase } from "@/domain/auth/application/use-cases/register-user.use-case";
import {
  StoreGoogleTokensUseCase,
  DisconnectGoogleUseCase,
  StoreGoToTokensUseCase,
} from "@/domain/auth/application/use-cases/oauth.use-cases";

// ── Fakes ────────────────────────────────────────────────────────────────────

const fakeLogin = { execute: vi.fn() } as unknown as LoginUseCase;
const fakeRegister = { execute: vi.fn() } as unknown as RegisterUserUseCase;
const fakeStoreGoogle = { execute: vi.fn() } as unknown as StoreGoogleTokensUseCase;
const fakeDisconnectGoogle = { execute: vi.fn() } as unknown as DisconnectGoogleUseCase;
const fakeStoreGoTo = { execute: vi.fn().mockResolvedValue({ isLeft: () => false }) } as unknown as StoreGoToTokensUseCase;

function makeController() {
  return new AuthController(
    fakeLogin,
    fakeRegister,
    fakeStoreGoogle,
    fakeDisconnectGoogle,
    fakeStoreGoTo,
    {} as any,
  );
}

// ── gotoAuth ─────────────────────────────────────────────────────────────────

describe("AuthController.gotoAuth()", () => {
  let controller: AuthController;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    controller = makeController();
    process.env.GOTO_CLIENT_ID = "test-client-id";
    process.env.BACKEND_URL = "https://api.example.com";
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    Object.keys(process.env).forEach((k) => {
      if (!(k in originalEnv)) delete process.env[k];
    });
  });

  it("returns a 302 redirect to GoTo authorization URL", () => {
    const result = controller.gotoAuth();

    expect(result.statusCode).toBe(302);
    expect(result.url).toContain("authentication.logmeininc.com/oauth/authorize");
  });

  it("includes client_id in the redirect URL", () => {
    const result = controller.gotoAuth();

    expect(result.url).toContain("client_id=test-client-id");
  });

  it("uses BACKEND_URL for redirect_uri", () => {
    const result = controller.gotoAuth();

    expect(result.url).toContain(encodeURIComponent("https://api.example.com/auth/goto/callback"));
  });

  it("falls back to localhost when BACKEND_URL is not set", () => {
    delete process.env.BACKEND_URL;

    const result = controller.gotoAuth();

    expect(result.url).toContain(encodeURIComponent("http://localhost:3010/auth/goto/callback"));
  });

  it("includes required GoTo scopes", () => {
    const result = controller.gotoAuth();

    expect(result.url).toContain("call-events");
    expect(result.url).toContain("cr.v1.read");
  });

  it("does not require authentication — method has no user parameter", () => {
    // gotoAuth() must be callable without any user/session argument
    // so a browser redirect (no JWT header) reaches GoTo's consent page
    expect(() => controller.gotoAuth()).not.toThrow();
  });
});

// ── gotoCallback ─────────────────────────────────────────────────────────────

describe("AuthController.gotoCallback()", () => {
  let controller: AuthController;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    controller = makeController();
    process.env.GOTO_CLIENT_ID = "test-client-id";
    process.env.GOTO_CLIENT_SECRET = "test-client-secret";
    process.env.BACKEND_URL = "https://api.example.com";
    process.env.FRONTEND_URL = "https://crm.example.com";
  });

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    Object.keys(process.env).forEach((k) => {
      if (!(k in originalEnv)) delete process.env[k];
    });
    vi.restoreAllMocks();
  });

  it("redirects to /admin (not /dashboard/admin) with error param on GoTo error", async () => {
    const result = await controller.gotoCallback("", "access_denied");

    expect(result.statusCode).toBe(302);
    expect(result.url).toContain("error=access_denied");
    expect(result.url).toContain("crm.example.com");
    expect(result.url).not.toContain("/dashboard/admin");
    expect(result.url).toContain("/admin");
  });

  it("redirects to /admin with error=no_code when code is absent", async () => {
    const result = await controller.gotoCallback("", "");

    expect(result.statusCode).toBe(302);
    expect(result.url).toContain("error=no_code");
    expect(result.url).not.toContain("/dashboard/admin");
    expect(result.url).toContain("/admin");
  });

  it("calls storeGoToTokens and redirects to /admin with success=1 on success", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
      }),
    }) as unknown as typeof fetch;

    const result = await controller.gotoCallback("valid-code", "");

    expect(fakeStoreGoTo.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      }),
    );
    expect(result.statusCode).toBe(302);
    expect(result.url).toContain("success=1");
    expect(result.url).not.toContain("/dashboard/admin");
    expect(result.url).toContain("/admin");
  });

  it("redirects to /admin with error=token_exchange_failed when exchange fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    }) as unknown as typeof fetch;

    const result = await controller.gotoCallback("bad-code", "");

    expect(result.statusCode).toBe(302);
    expect(result.url).toContain("error=token_exchange_failed");
    expect(result.url).not.toContain("/dashboard/admin");
    expect(result.url).toContain("/admin");
  });
});
