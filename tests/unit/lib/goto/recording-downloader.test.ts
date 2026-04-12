/**
 * GoTo Recording Downloader Tests
 *
 * Tests for src/lib/goto/recording-downloader.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock token manager
vi.mock("@/lib/goto/token-manager", () => ({
  getValidAccessToken: vi.fn(),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { downloadCallRecording } from "@/lib/goto/recording-downloader";
import { getValidAccessToken } from "@/lib/goto/token-manager";

const mockGetToken = vi.mocked(getValidAccessToken);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetToken.mockResolvedValue("valid-access-token");
});

describe("downloadCallRecording", () => {
  it("baixa o áudio usando Bearer token e retorna buffer com contentType", async () => {
    const fakeAudio = Buffer.from("MP3 audio bytes");
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: (h: string) => (h === "content-type" ? "audio/mpeg" : null) },
      arrayBuffer: async () => fakeAudio.buffer,
    });

    const result = await downloadCallRecording("rec-abc-123");

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.contentType).toBe("audio/mpeg");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.goto.com/recording/v1/recordings/rec-abc-123/content",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer valid-access-token",
        }),
      })
    );
  });

  it("obtém token via getValidAccessToken antes do download", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "audio/wav" },
      arrayBuffer: async () => new ArrayBuffer(8),
    });

    await downloadCallRecording("rec-xyz");

    expect(mockGetToken).toHaveBeenCalledOnce();
  });

  it("lança erro quando recording não encontrado (404)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => "Recording not found",
    });

    await expect(downloadCallRecording("rec-invalid")).rejects.toThrow("404");
  });

  it("usa audio/mpeg como fallback quando content-type ausente", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      headers: { get: () => null }, // sem content-type
      arrayBuffer: async () => new ArrayBuffer(4),
    });

    const result = await downloadCallRecording("rec-no-ct");
    expect(result.contentType).toBe("audio/mpeg");
  });
});
