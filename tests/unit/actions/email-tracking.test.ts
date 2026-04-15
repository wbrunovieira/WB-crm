/**
 * Email Tracking Tests
 *
 * Tests for src/lib/email-tracking.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "../../setup";

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { trackEmailOpen, trackEmailClick } from "@/lib/email-tracking";

const TOKEN = "tracking-token-abc123";

const mockActivityWithToken = {
  id: "activity-email-1",
  emailTrackingToken: TOKEN,
  emailOpenedAt: null,
  emailLinkClickedAt: null,
};

beforeEach(() => {
  prismaMock.activity.findUnique.mockResolvedValue(mockActivityWithToken as never);
  prismaMock.activity.update.mockResolvedValue({ id: "activity-email-1" } as never);
});

// ---------------------------------------------------------------------------
describe("trackEmailOpen — abertura real", () => {
  it("retorna counted: true para abertura real", async () => {
    const result = await trackEmailOpen(TOKEN, "Mozilla/5.0", "200.100.50.1");
    expect(result.counted).toBe(true);
  });

  it("incrementa emailOpenCount via prisma.activity.update", async () => {
    await trackEmailOpen(TOKEN, "Mozilla/5.0", "200.100.50.1");

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailOpenCount: { increment: 1 },
        }),
      })
    );
  });

  it("define emailOpenedAt na primeira abertura (quando é null)", async () => {
    await trackEmailOpen(TOKEN, "Mozilla/5.0", "200.100.50.1");

    const call = prismaMock.activity.update.mock.calls[0][0];
    expect(call.data.emailOpenedAt).toBeInstanceOf(Date);
  });

  it("atualiza emailLastOpenedAt sempre", async () => {
    await trackEmailOpen(TOKEN, "Mozilla/5.0", "200.100.50.1");

    const call = prismaMock.activity.update.mock.calls[0][0];
    expect(call.data.emailLastOpenedAt).toBeInstanceOf(Date);
  });

  it("NÃO sobrescreve emailOpenedAt em aberturas subsequentes", async () => {
    const existingDate = new Date("2026-01-01");
    prismaMock.activity.findUnique.mockResolvedValue({
      ...mockActivityWithToken,
      emailOpenedAt: existingDate,
    } as never);

    await trackEmailOpen(TOKEN, "Mozilla/5.0", "200.100.50.1");

    const call = prismaMock.activity.update.mock.calls[0][0];
    expect(call.data.emailOpenedAt).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
describe("trackEmailOpen — filtros Apple MPP e Gmail Proxy", () => {
  it("NÃO conta abertura de IP Apple MPP (17.x.x.x)", async () => {
    const result = await trackEmailOpen(TOKEN, "Mozilla/5.0 (iPhone)", "17.58.100.22");

    expect(result.counted).toBe(false);
    expect(result.reason).toBe("apple_mpp");
  });

  it("não chama update para Apple MPP", async () => {
    await trackEmailOpen(TOKEN, "Mozilla/5.0", "17.0.0.1");
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("NÃO conta abertura do GoogleImageProxy", async () => {
    const result = await trackEmailOpen(
      TOKEN,
      "Mozilla/5.0 (compatible; GoogleImageProxy)",
      "66.102.0.1"
    );

    expect(result.counted).toBe(false);
    expect(result.reason).toBe("gmail_proxy");
  });

  it("não chama update para GoogleImageProxy", async () => {
    await trackEmailOpen(TOKEN, "GoogleImageProxy", "66.102.0.1");
    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });

  it("conta IP 17.x no meio (não é prefixo Apple) — ex: 117.0.0.1", async () => {
    const result = await trackEmailOpen(TOKEN, "Mozilla/5.0", "117.0.0.1");
    expect(result.counted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe("trackEmailOpen — token inválido", () => {
  it("lança erro se token não encontrado", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null as never);

    await expect(trackEmailOpen("token-invalido", "Mozilla/5.0", "1.2.3.4")).rejects.toThrow(
      /token/i
    );
  });
});

// ---------------------------------------------------------------------------
describe("trackEmailClick — clique em link", () => {
  it("retorna counted: true", async () => {
    const result = await trackEmailClick(TOKEN);
    expect(result.counted).toBe(true);
  });

  it("incrementa emailLinkClickCount via prisma.activity.update", async () => {
    await trackEmailClick(TOKEN);

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          emailLinkClickCount: { increment: 1 },
        }),
      })
    );
  });

  it("define emailLinkClickedAt no primeiro clique (quando é null)", async () => {
    await trackEmailClick(TOKEN);

    const call = prismaMock.activity.update.mock.calls[0][0];
    expect(call.data.emailLinkClickedAt).toBeInstanceOf(Date);
  });

  it("atualiza emailLastLinkClickedAt sempre", async () => {
    await trackEmailClick(TOKEN);

    const call = prismaMock.activity.update.mock.calls[0][0];
    expect(call.data.emailLastLinkClickedAt).toBeInstanceOf(Date);
  });

  it("NÃO sobrescreve emailLinkClickedAt em cliques subsequentes", async () => {
    const existingDate = new Date("2026-01-01");
    prismaMock.activity.findUnique.mockResolvedValue({
      ...mockActivityWithToken,
      emailLinkClickedAt: existingDate,
    } as never);

    await trackEmailClick(TOKEN);

    const call = prismaMock.activity.update.mock.calls[0][0];
    expect(call.data.emailLinkClickedAt).toBeUndefined();
  });

  it("lança erro se token não encontrado", async () => {
    prismaMock.activity.findUnique.mockResolvedValue(null as never);

    await expect(trackEmailClick("token-invalido")).rejects.toThrow(/token/i);
  });
});
