import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GoToApiClient } from "@/domain/integrations/goto/infra/goto-api.client";

let client: GoToApiClient;
let fetchSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  client = new GoToApiClient();
  fetchSpy = vi.fn();
  vi.stubGlobal("fetch", fetchSpy);
  process.env.GOTO_ACCOUNT_KEY = "test-account-key-123";
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.GOTO_ACCOUNT_KEY;
});

function okJson(data: unknown) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

describe("GoToApiClient.fetchReportsSince", () => {
  it("includes accountKey from env in request", async () => {
    fetchSpy.mockReturnValueOnce(okJson({ reports: [] }));

    await client.fetchReportsSince("access-token", "2026-04-22T00:00:00.000Z");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("accountKey=test-account-key-123");
  });

  it("includes startDate in request", async () => {
    fetchSpy.mockReturnValueOnce(okJson({ reports: [] }));

    await client.fetchReportsSince("access-token", "2026-04-22T10:00:00.000Z");

    const calledUrl = fetchSpy.mock.calls[0][0] as string;
    expect(calledUrl).toContain("startDate=2026-04-22T10%3A00%3A00.000Z");
  });

  it("sends Authorization Bearer header", async () => {
    fetchSpy.mockReturnValueOnce(okJson({ reports: [] }));

    await client.fetchReportsSince("my-token", "2026-04-22T00:00:00.000Z");

    const calledHeaders = fetchSpy.mock.calls[0][1].headers as Record<string, string>;
    expect(calledHeaders["Authorization"]).toBe("Bearer my-token");
  });

  it("returns empty array on 400 response", async () => {
    fetchSpy.mockReturnValueOnce(Promise.resolve({ ok: false, status: 400 }));

    const result = await client.fetchReportsSince("token", "2026-04-22T00:00:00.000Z");

    expect(result).toEqual([]);
  });

  it("returns all reports from 'items' field (GoTo API response format)", async () => {
    const mockReport = {
      conversationSpaceId: "call-001",
      accountKey: "acc",
      direction: "OUTBOUND",
      callCreated: "2026-04-22T10:00:00Z",
      callEnded: "2026-04-22T10:05:00Z",
      participants: [],
    };
    // GoTo API returns { pageSize: N, items: [...] } not { reports: [...] }
    fetchSpy.mockReturnValueOnce(okJson({ pageSize: 25, items: [mockReport] }));

    const result = await client.fetchReportsSince("token", "2026-04-22T00:00:00.000Z");

    expect(result).toHaveLength(1);
    expect(result[0].conversationSpaceId).toBe("call-001");
  });

  it("returns empty array when no items in response", async () => {
    fetchSpy.mockReturnValueOnce(okJson({ pageSize: 25, items: [] }));

    const result = await client.fetchReportsSince("token", "2026-04-22T00:00:00.000Z");

    expect(result).toEqual([]);
  });
});
