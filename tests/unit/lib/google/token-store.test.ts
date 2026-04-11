/**
 * Google Token Store Tests
 *
 * Tests for src/lib/google/token-store.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    googleToken: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { getStoredToken, saveToken, deleteToken, isTokenExpired } from "@/lib/google/token-store";
import { prisma } from "@/lib/prisma";

const mockFindFirst = vi.mocked(prisma.googleToken.findFirst);
const mockUpsert = vi.mocked(prisma.googleToken.upsert);
const mockDeleteMany = vi.mocked(prisma.googleToken.deleteMany);

const STORED_TOKEN = {
  id: "token-1",
  accessToken: "access-abc",
  refreshToken: "refresh-xyz",
  expiresAt: new Date(Date.now() + 3600 * 1000),
  scope: "gmail drive calendar",
  email: "admin@wbdigitalsolutions.com",
  createdAt: new Date(),
  updatedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
describe("getStoredToken", () => {
  it("retorna o token armazenado quando existe", async () => {
    mockFindFirst.mockResolvedValue(STORED_TOKEN);

    const token = await getStoredToken();

    expect(token).toEqual(STORED_TOKEN);
    expect(mockFindFirst).toHaveBeenCalledOnce();
  });

  it("retorna null quando não há token", async () => {
    mockFindFirst.mockResolvedValue(null);

    const token = await getStoredToken();

    expect(token).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe("saveToken", () => {
  it("salva o token via upsert (substitui o existente)", async () => {
    mockUpsert.mockResolvedValue(STORED_TOKEN);

    await saveToken({
      accessToken: "new-access",
      refreshToken: "new-refresh",
      expiresAt: new Date(Date.now() + 3600 * 1000),
      scope: "gmail drive",
      email: "admin@wbdigitalsolutions.com",
    });

    expect(mockUpsert).toHaveBeenCalledOnce();
  });

  it("salva o email correto", async () => {
    mockUpsert.mockResolvedValue(STORED_TOKEN);

    await saveToken({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: new Date(),
      scope: "gmail",
      email: "bruno@wbdigitalsolutions.com",
    });

    const call = mockUpsert.mock.calls[0][0];
    const data = call.create ?? call.update;
    expect(data.email).toBe("bruno@wbdigitalsolutions.com");
  });
});

// ---------------------------------------------------------------------------
describe("deleteToken", () => {
  it("apaga todos os tokens do banco", async () => {
    mockDeleteMany.mockResolvedValue({ count: 1 });

    await deleteToken();

    expect(mockDeleteMany).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
describe("isTokenExpired", () => {
  it("retorna false para token válido (expira em 10 minutos)", () => {
    const token = { ...STORED_TOKEN, expiresAt: new Date(Date.now() + 10 * 60 * 1000) };
    expect(isTokenExpired(token)).toBe(false);
  });

  it("retorna true para token expirado", () => {
    const token = { ...STORED_TOKEN, expiresAt: new Date(Date.now() - 1000) };
    expect(isTokenExpired(token)).toBe(true);
  });

  it("considera expirado quando faltam menos de 5 minutos (margem de segurança)", () => {
    const token = { ...STORED_TOKEN, expiresAt: new Date(Date.now() + 4 * 60 * 1000) };
    expect(isTokenExpired(token)).toBe(true);
  });
});
