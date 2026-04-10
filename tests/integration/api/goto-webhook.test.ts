/**
 * GoTo Webhook Route Tests
 *
 * Tests for src/app/api/goto/webhook/route.ts
 * - Resposta ao ping de verificação do GoTo
 * - Rejeição de requests sem secret válido
 * - Aceitação de payload de evento válido
 * - Rejeição de payload malformado
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/goto/webhook/route";
import { NextRequest } from "next/server";

const VALID_SECRET = "test-webhook-secret-abc123";

beforeEach(() => {
  vi.stubEnv("GOTO_WEBHOOK_SECRET", VALID_SECRET);
});

function makeRequest(
  body: string | null,
  options: { secret?: string; userAgent?: string } = {}
): NextRequest {
  const secret = options.secret ?? VALID_SECRET;
  const url = `https://crm.wbdigitalsolutions.com/api/goto/webhook?secret=${secret}`;

  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": options.userAgent ?? "GoTo Notifications",
    },
    body: body ?? undefined,
  });
}

describe("GoTo Webhook — ping de verificação", () => {
  it("deve responder 200 para ping com body vazio (verificação do GoTo)", async () => {
    const req = makeRequest("", { userAgent: "GoTo Notifications" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("deve responder 200 para ping com body null", async () => {
    const req = makeRequest(null, { userAgent: "GoTo Notifications" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe("GoTo Webhook — validação de secret", () => {
  it("deve retornar 401 se secret não for fornecido", async () => {
    const url =
      "https://crm.wbdigitalsolutions.com/api/goto/webhook";
    const req = new NextRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType: "STARTING" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("deve retornar 401 se secret for inválido", async () => {
    const req = makeRequest(JSON.stringify({ eventType: "STARTING" }), {
      secret: "wrong-secret",
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("deve retornar 200 com secret válido", async () => {
    const req = makeRequest(
      JSON.stringify({
        eventType: "ENDING",
        callEvent: {
          metadata: {
            conversationSpaceId: "conv-123",
            direction: "OUTBOUND",
            accountKey: "GOTO_ACCOUNT_KEY_REDACTED",
            callCreated: new Date().toISOString(),
          },
          state: {
            id: "state-1",
            sequenceNumber: 1,
            type: "ENDING",
            timestamp: new Date().toISOString(),
            participants: [],
          },
        },
      })
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});

describe("GoTo Webhook — payload inválido", () => {
  it("deve retornar 400 para JSON malformado", async () => {
    const url = `https://crm.wbdigitalsolutions.com/api/goto/webhook?secret=${VALID_SECRET}`;
    const req = new NextRequest(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json {{",
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("GoTo Webhook — eventos de chamada", () => {
  it("deve processar evento STARTING e retornar 200", async () => {
    const req = makeRequest(
      JSON.stringify({
        eventType: "STARTING",
        callEvent: {
          metadata: {
            conversationSpaceId: "conv-starting-123",
            direction: "OUTBOUND",
            accountKey: "GOTO_ACCOUNT_KEY_REDACTED",
            callCreated: new Date().toISOString(),
          },
          state: {
            id: "state-1",
            sequenceNumber: 1,
            type: "STARTING",
            timestamp: new Date().toISOString(),
            participants: [
              {
                participantId: "p1",
                legId: "leg1",
                status: { value: "RINGING" },
                type: { value: "LINE", extensionNumber: "1042" },
              },
            ],
          },
        },
      })
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("deve processar evento REPORT_SUMMARY e retornar 200", async () => {
    const req = makeRequest(
      JSON.stringify({
        eventType: "REPORT_SUMMARY",
        reportSummary: {
          conversationSpaceId: "conv-report-456",
          accountKey: "GOTO_ACCOUNT_KEY_REDACTED",
          callCreated: new Date(Date.now() - 60000).toISOString(),
          callEnded: new Date().toISOString(),
        },
      })
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("não deve retornar 500 para evento desconhecido — apenas ignora", async () => {
    const req = makeRequest(
      JSON.stringify({ eventType: "UNKNOWN_FUTURE_EVENT", data: {} })
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
