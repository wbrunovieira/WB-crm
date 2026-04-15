/**
 * Track Click Redirect Route Tests
 *
 * Tests for src/app/api/track/click/[token]/route.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/email-tracking", () => ({
  trackEmailClick: vi.fn(),
}));

import { GET } from "@/app/api/track/click/[token]/route";
import { trackEmailClick } from "@/lib/email-tracking";

const mockTrackClick = vi.mocked(trackEmailClick);

function makeRequest(token: string, dest?: string): NextRequest {
  const url = dest
    ? `http://localhost/api/track/click/${token}?dest=${encodeURIComponent(dest)}`
    : `http://localhost/api/track/click/${token}`;
  return new NextRequest(url);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTrackClick.mockResolvedValue({ counted: true });
});

// ---------------------------------------------------------------------------
describe("GET /api/track/click/[token] — redirecionamento", () => {
  it("redireciona para a URL de destino (status 302)", async () => {
    const req = makeRequest("token-abc", "https://example.com/pagina");
    const res = await GET(req, { params: { token: "token-abc" } });

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe("https://example.com/pagina");
  });

  it("chama trackEmailClick com o token correto", async () => {
    const req = makeRequest("meu-token", "https://example.com");
    await GET(req, { params: { token: "meu-token" } });

    expect(mockTrackClick).toHaveBeenCalledWith("meu-token");
  });

  it("ainda redireciona mesmo se trackEmailClick falhar (token inválido)", async () => {
    mockTrackClick.mockRejectedValue(new Error("Token não encontrado"));

    const req = makeRequest("token-invalido", "https://example.com");
    const res = await GET(req, { params: { token: "token-invalido" } });

    expect(res.status).toBe(307);
    expect(res.headers.get("Location")).toBe("https://example.com");
  });

  it("retorna 400 quando dest não é informado", async () => {
    const req = makeRequest("token-abc"); // sem dest
    const res = await GET(req, { params: { token: "token-abc" } });

    expect(res.status).toBe(400);
  });

  it("não chama trackEmailClick quando não há destino", async () => {
    const req = makeRequest("token-abc");
    await GET(req, { params: { token: "token-abc" } });

    expect(mockTrackClick).not.toHaveBeenCalled();
  });
});
