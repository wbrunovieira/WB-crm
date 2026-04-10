/**
 * GoTo Connect Notification Channel Tests
 *
 * Tests for src/lib/goto/notification-channel.ts
 * - Criação de Notification Channel (webhook)
 * - Criação de subscription para call-events
 * - Criação de subscription para call-events-report
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createNotificationChannel,
  createCallEventsSubscription,
  createCallReportSubscription,
} from "@/lib/goto/notification-channel";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const MOCK_ACCESS_TOKEN = "test-access-token";
const MOCK_ACCOUNT_KEY = "8583618328163306147";
const MOCK_WEBHOOK_URL =
  "https://crm.wbdigitalsolutions.com/api/goto/webhook?secret=abc123";

beforeEach(() => {
  vi.stubEnv("GOTO_ACCOUNT_KEY", MOCK_ACCOUNT_KEY);
  mockFetch.mockReset();
});

describe("createNotificationChannel", () => {
  it("deve criar channel e retornar channelId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        channelId: "Webhook.abc-123",
        channelType: "Webhook",
      }),
    });

    const result = await createNotificationChannel(
      MOCK_ACCESS_TOKEN,
      MOCK_WEBHOOK_URL
    );

    expect(result.channelId).toBe("Webhook.abc-123");
  });

  it("deve chamar o endpoint correto de criação de channel", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ channelId: "Webhook.abc-123" }),
    });

    await createNotificationChannel(MOCK_ACCESS_TOKEN, MOCK_WEBHOOK_URL);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("notification-channel/v1/channels");
  });

  it("deve incluir o Bearer token no header", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ channelId: "Webhook.abc-123" }),
    });

    await createNotificationChannel(MOCK_ACCESS_TOKEN, MOCK_WEBHOOK_URL);

    const [, options] = mockFetch.mock.calls[0];
    expect(options.headers["Authorization"]).toBe(
      `Bearer ${MOCK_ACCESS_TOKEN}`
    );
  });

  it("deve incluir a webhookUrl no body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ channelId: "Webhook.abc-123" }),
    });

    await createNotificationChannel(MOCK_ACCESS_TOKEN, MOCK_WEBHOOK_URL);

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.webhookUrl ?? body.channelData?.webhookUrl ?? JSON.stringify(body)).toContain(
      MOCK_WEBHOOK_URL
    );
  });

  it("deve lançar erro se o GoTo retornar 401", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    });

    await expect(
      createNotificationChannel(MOCK_ACCESS_TOKEN, MOCK_WEBHOOK_URL)
    ).rejects.toThrow();
  });
});

describe("createCallEventsSubscription", () => {
  it("deve criar subscription e retornar subscriptionId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscriptionId: "sub-call-events-123",
        channelId: "Webhook.abc-123",
      }),
    });

    const result = await createCallEventsSubscription(
      MOCK_ACCESS_TOKEN,
      "Webhook.abc-123"
    );

    expect(result.subscriptionId).toBe("sub-call-events-123");
  });

  it("deve incluir STARTING e ENDING nos eventos subscritos", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscriptionId: "sub-123" }),
    });

    await createCallEventsSubscription(MOCK_ACCESS_TOKEN, "Webhook.abc-123");

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).toContain("STARTING");
    expect(bodyStr).toContain("ENDING");
  });

  it("deve incluir o accountKey no body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscriptionId: "sub-123" }),
    });

    await createCallEventsSubscription(MOCK_ACCESS_TOKEN, "Webhook.abc-123");

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(JSON.stringify(body)).toContain(MOCK_ACCOUNT_KEY);
  });
});

describe("createCallReportSubscription", () => {
  it("deve criar subscription de relatório e retornar subscriptionId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        subscriptionId: "sub-report-456",
        channelId: "Webhook.abc-123",
      }),
    });

    const result = await createCallReportSubscription(
      MOCK_ACCESS_TOKEN,
      "Webhook.abc-123"
    );

    expect(result.subscriptionId).toBe("sub-report-456");
  });

  it("deve incluir REPORT_SUMMARY nos eventos subscritos", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ subscriptionId: "sub-456" }),
    });

    await createCallReportSubscription(MOCK_ACCESS_TOKEN, "Webhook.abc-123");

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(JSON.stringify(body)).toContain("REPORT_SUMMARY");
  });
});
