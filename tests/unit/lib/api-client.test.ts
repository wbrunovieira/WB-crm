import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "@/lib/api-client";

vi.stubGlobal("fetch", vi.fn());

function makeFetchResponse(status: number, body: string, contentType = "application/json") {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: "OK",
    headers: { get: (h: string) => (h === "content-type" ? contentType : null) },
    text: () => Promise.resolve(body),
    json: () => (body ? Promise.resolve(JSON.parse(body)) : Promise.reject(new SyntaxError("Unexpected end of JSON input"))),
  } as unknown as Response;
}

describe("apiFetch", () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it("returns parsed JSON for 200 with body", async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, JSON.stringify({ id: "123" })));
    const result = await apiFetch<{ id: string }>("/leads/123", "token");
    expect(result).toEqual({ id: "123" });
  });

  it("returns undefined for 204 No Content", async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(204, ""));
    const result = await apiFetch("/leads/123/qualify", "token", { method: "PATCH" });
    expect(result).toBeUndefined();
  });

  it("returns undefined for 200 with empty body (e.g. qualify endpoint)", async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(200, ""));
    const result = await apiFetch("/leads/123/qualify", "token", { method: "PATCH" });
    expect(result).toBeUndefined();
  });

  it("throws error with message for non-ok response with JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(404, JSON.stringify({ message: "Lead não encontrado" })));
    await expect(apiFetch("/leads/999", "token")).rejects.toThrow("Lead não encontrado");
  });

  it("throws error with statusText for non-ok response with empty body", async () => {
    vi.mocked(fetch).mockResolvedValue(makeFetchResponse(500, ""));
    await expect(apiFetch("/leads/999", "token")).rejects.toThrow();
  });
});
