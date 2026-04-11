/**
 * Google OAuth Auth Tests
 *
 * Tests for src/lib/google/auth.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/google/token-store", () => ({
  getStoredToken: vi.fn(),
  saveToken: vi.fn(),
  isTokenExpired: vi.fn((token: { expiresAt: Date }) =>
    token.expiresAt.getTime() - Date.now() < 5 * 60 * 1000
  ),
}));

import { getAuthUrl, exchangeCode, getValidToken, getAuthenticatedClient } from "@/lib/google/auth";
import type { OAuth2Client } from "google-auth-library";
import { getStoredToken, saveToken } from "@/lib/google/token-store";

const mockGetStoredToken = vi.mocked(getStoredToken);
const mockSaveToken = vi.mocked(saveToken);

const EMAIL = "admin@wbdigitalsolutions.com";

// Fábrica de mock do OAuth2Client — injeta nos testes sem mockar googleapis
function makeMockClient(overrides: Partial<{
  generateAuthUrl: () => string;
  getToken: (code: string) => Promise<{ tokens: Record<string, unknown> }>;
  refreshAccessToken: () => Promise<{ credentials: Record<string, unknown> }>;
  setCredentials: (creds: Record<string, unknown>) => void;
}> = {}) {
  return {
    generateAuthUrl: vi.fn().mockReturnValue(
      "https://accounts.google.com/o/oauth2/auth?scope=gmail&access_type=offline"
    ),
    getToken: vi.fn().mockResolvedValue({
      tokens: {
        access_token: "access-token-123",
        refresh_token: "refresh-token-456",
        expiry_date: Date.now() + 3600 * 1000,
        scope: "https://www.googleapis.com/auth/gmail.send",
      },
    }),
    refreshAccessToken: vi.fn().mockResolvedValue({
      credentials: {
        access_token: "new-access-token",
        expiry_date: Date.now() + 3600 * 1000,
      },
    }),
    setCredentials: vi.fn(),
    ...overrides,
  } as unknown as OAuth2Client;
}

const VALID_TOKEN = {
  id: "token-1",
  accessToken: "access-123",
  refreshToken: "refresh-456",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1h no futuro
  scope: "gmail",
  email: EMAIL,
  gmailHistoryId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const EXPIRED_TOKEN = {
  ...VALID_TOKEN,
  expiresAt: new Date(Date.now() - 1000),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe("getAuthUrl", () => {
  it("retorna URL do Google OAuth", () => {
    const mockClient = makeMockClient();
    const url = getAuthUrl(mockClient);
    expect(url).toContain("accounts.google.com");
  });

  it("chama generateAuthUrl com access_type offline", () => {
    const mockClient = makeMockClient();
    getAuthUrl(mockClient);
    expect(mockClient.generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ access_type: "offline" })
    );
  });

  it("inclui prompt: consent para garantir refresh_token", () => {
    const mockClient = makeMockClient();
    getAuthUrl(mockClient);
    expect(mockClient.generateAuthUrl).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: "consent" })
    );
  });
});

// ---------------------------------------------------------------------------
describe("exchangeCode", () => {
  it("troca o code por tokens e retorna access + refresh token", async () => {
    const mockClient = makeMockClient();
    const result = await exchangeCode("auth-code-abc", EMAIL, mockClient);

    expect(result.accessToken).toBe("access-token-123");
    expect(result.refreshToken).toBe("refresh-token-456");
    expect(result.expiresAt).toBeInstanceOf(Date);
  });

  it("persiste o email passado como parâmetro", async () => {
    const mockClient = makeMockClient();
    const result = await exchangeCode("auth-code-abc", EMAIL, mockClient);
    expect(result.email).toBe(EMAIL);
  });

  it("salva o token no banco após troca", async () => {
    const mockClient = makeMockClient();
    await exchangeCode("auth-code-abc", EMAIL, mockClient);
    expect(mockSaveToken).toHaveBeenCalledOnce();
  });

  it("chama getToken com o code correto", async () => {
    const mockClient = makeMockClient();
    await exchangeCode("meu-code", EMAIL, mockClient);
    expect(mockClient.getToken).toHaveBeenCalledWith("meu-code");
  });
});

// ---------------------------------------------------------------------------
describe("getValidToken", () => {
  it("retorna token válido diretamente quando não está expirado", async () => {
    mockGetStoredToken.mockResolvedValue(VALID_TOKEN);

    const token = await getValidToken();

    expect(token.accessToken).toBe("access-123");
    expect(mockSaveToken).not.toHaveBeenCalled();
  });

  it("lança erro quando não há token armazenado", async () => {
    mockGetStoredToken.mockResolvedValue(null);

    await expect(getValidToken()).rejects.toThrow(/conta Google não conectada/i);
  });

  it("renova e salva quando token está expirado", async () => {
    mockGetStoredToken.mockResolvedValue(EXPIRED_TOKEN);
    const mockClient = makeMockClient();

    const token = await getValidToken(() => mockClient);

    expect(mockSaveToken).toHaveBeenCalledOnce();
    expect(token.accessToken).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
describe("getAuthenticatedClient", () => {
  it("retorna cliente com credenciais quando conta está conectada", async () => {
    mockGetStoredToken.mockResolvedValue(VALID_TOKEN);

    const client = await getAuthenticatedClient();

    expect(client).toBeDefined();
  });

  it("lança erro quando conta não está conectada", async () => {
    mockGetStoredToken.mockResolvedValue(null);

    await expect(getAuthenticatedClient()).rejects.toThrow(/conta Google não conectada/i);
  });
});
