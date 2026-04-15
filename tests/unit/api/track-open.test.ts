/**
 * Track Open Pixel Route Tests
 *
 * Tests for src/app/api/track/open/[token]/route.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/email-tracking", () => ({
  trackEmailOpen: vi.fn(),
}));

import { GET } from "@/app/api/track/open/[token]/route";
import { trackEmailOpen } from "@/lib/email-tracking";

const mockTrackOpen = vi.mocked(trackEmailOpen);

function makeRequest(token: string, ua = "Mozilla/5.0", ip = "200.100.50.1"): NextRequest {
  return new NextRequest(`http://localhost/api/track/open/${token}`, {
    headers: {
      "user-agent": ua,
      "x-forwarded-for": ip,
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockTrackOpen.mockResolvedValue({ counted: true });
});

// ---------------------------------------------------------------------------
describe("GET /api/track/open/[token] — pixel de abertura", () => {
  it("retorna status 200", async () => {
    const req = makeRequest("valid-token");
    const res = await GET(req, { params: { token: "valid-token" } });
    expect(res.status).toBe(200);
  });

  it("retorna Content-Type image/gif", async () => {
    const req = makeRequest("valid-token");
    const res = await GET(req, { params: { token: "valid-token" } });
    expect(res.headers.get("Content-Type")).toBe("image/gif");
  });

  it("retorna dados binários GIF (não vazio)", async () => {
    const req = makeRequest("valid-token");
    const res = await GET(req, { params: { token: "valid-token" } });
    const buffer = await res.arrayBuffer();
    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("inclui Cache-Control: no-store para evitar cache do browser", async () => {
    const req = makeRequest("valid-token");
    const res = await GET(req, { params: { token: "valid-token" } });
    expect(res.headers.get("Cache-Control")).toMatch(/no-store/i);
  });

  it("chama trackEmailOpen com token, user-agent e IP", async () => {
    const req = makeRequest("abc123", "Mozilla/5.0 (Windows)", "189.50.1.2");
    await GET(req, { params: { token: "abc123" } });

    expect(mockTrackOpen).toHaveBeenCalledWith("abc123", "Mozilla/5.0 (Windows)", "189.50.1.2");
  });

  it("retorna GIF mesmo quando token é inválido (não vaza 404)", async () => {
    mockTrackOpen.mockRejectedValue(new Error("Token não encontrado"));

    const req = makeRequest("token-invalido");
    const res = await GET(req, { params: { token: "token-invalido" } });

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/gif");
  });

  it("retorna GIF mesmo quando trackEmailOpen falha com erro inesperado", async () => {
    mockTrackOpen.mockRejectedValue(new Error("database error"));

    const req = makeRequest("qualquer-token");
    const res = await GET(req, { params: { token: "qualquer-token" } });

    expect(res.status).toBe(200);
  });
});
