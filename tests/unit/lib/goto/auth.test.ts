/**
 * GoTo Connect Auth Service Tests
 *
 * Tests for src/lib/goto/auth.ts
 * - Geração da URL de autorização OAuth
 * - Troca de code por tokens
 * - Renovação de token expirado
 * - Detecção de token expirado
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  isTokenExpired,
} from "@/lib/goto/auth";

// Mock fetch global
const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_ENV = {
  GOTO_CLIENT_ID: "cfaf73a7-test",
  GOTO_CLIENT_SECRET: "secret-test",
};

beforeEach(() => {
  vi.stubEnv("GOTO_CLIENT_ID", MOCK_ENV.GOTO_CLIENT_ID);
  vi.stubEnv("GOTO_CLIENT_SECRET", MOCK_ENV.GOTO_CLIENT_SECRET);
  vi.stubEnv("NEXTAUTH_URL", "http://localhost:3000");
  mockFetch.mockReset();
});

describe("buildAuthorizationUrl", () => {
  it("deve retornar URL com client_id correto", () => {
    const url = new URL(buildAuthorizationUrl());
    expect(url.searchParams.get("client_id")).toBe(MOCK_ENV.GOTO_CLIENT_ID);
  });

  it("deve retornar URL com response_type=code", () => {
    const url = new URL(buildAuthorizationUrl());
    expect(url.searchParams.get("response_type")).toBe("code");
  });

  it("deve incluir redirect_uri apontando para /api/goto/callback", () => {
    const url = new URL(buildAuthorizationUrl());
    expect(url.searchParams.get("redirect_uri")).toContain(
      "/api/goto/callback"
    );
  });

  it("deve apontar para o host de autenticação do GoTo", () => {
    const url = new URL(buildAuthorizationUrl());
    expect(url.host).toBe("authentication.logmeininc.com");
  });

  it("deve incluir os scopes necessários", () => {
    const url = new URL(buildAuthorizationUrl());
    const scope = url.searchParams.get("scope") ?? "";
    expect(scope).toContain("call-events.v1.notifications.manage");
    expect(scope).toContain("call-events.v1.events.read");
    expect(scope).toContain("cr.v1.read");
  });
});

describe("exchangeCodeForTokens", () => {
  it("deve trocar code por access_token e refresh_token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "access-abc",
        refresh_token: "refresh-xyz",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });

    const tokens = await exchangeCodeForTokens("auth-code-123");

    expect(tokens.accessToken).toBe("access-abc");
    expect(tokens.refreshToken).toBe("refresh-xyz");
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  it("deve chamar o endpoint correto do GoTo", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "abc",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });

    await exchangeCodeForTokens("code-123");

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "https://authentication.logmeininc.com/oauth/token"
    );
  });

  it("deve enviar client_id e client_secret como Basic auth", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "abc",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });

    await exchangeCodeForTokens("code-123");

    const [, options] = mockFetch.mock.calls[0];
    const authHeader = options.headers["Authorization"] as string;
    expect(authHeader).toMatch(/^Basic /);

    const decoded = atob(authHeader.replace("Basic ", ""));
    expect(decoded).toBe(
      `${MOCK_ENV.GOTO_CLIENT_ID}:${MOCK_ENV.GOTO_CLIENT_SECRET}`
    );
  });

  it("deve lançar erro se a resposta do GoTo for 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "invalid_client" }),
    });

    await expect(exchangeCodeForTokens("bad-code")).rejects.toThrow();
  });
});

describe("refreshAccessToken", () => {
  it("deve retornar novo access_token usando refresh_token", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: "new-access",
        refresh_token: "new-refresh",
        expires_in: 3600,
        token_type: "Bearer",
      }),
    });

    const tokens = await refreshAccessToken("old-refresh-token");

    expect(tokens.accessToken).toBe("new-access");
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
  });

  it("deve lançar erro se refresh_token for inválido", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "invalid_grant" }),
    });

    await expect(refreshAccessToken("invalid-refresh")).rejects.toThrow();
  });
});

describe("isTokenExpired", () => {
  it("deve retornar true se expiresAt está no passado", () => {
    expect(isTokenExpired(Date.now() - 1000)).toBe(true);
  });

  it("deve retornar true se expira em menos de 5 minutos (buffer)", () => {
    expect(isTokenExpired(Date.now() + 4 * 60 * 1000)).toBe(true);
  });

  it("deve retornar false se expira em mais de 5 minutos", () => {
    expect(isTokenExpired(Date.now() + 10 * 60 * 1000)).toBe(false);
  });
});
