/**
 * Transcriptor API Client Tests
 *
 * Tests for src/lib/transcriptor.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  submitVideoForTranscription,
  getTranscriptionStatus,
  getTranscriptionResult,
} from "@/lib/transcriptor";

// Replace global fetch with a vi.fn() before each test so happy-dom's
// CORS-enforcing fetch never runs.
const mockFetch = vi.fn();

beforeEach(() => {
  globalThis.fetch = mockFetch as typeof fetch;
  mockFetch.mockReset();
  // Set env vars so lazy readers in the implementation pick them up
  process.env.TRANSCRIPTOR_BASE_URL = "https://transcritor.wbdigitalsolutions.com";
  process.env.TRANSCRIPTOR_API_KEY = "test-api-key";
});

// ---------------------------------------------------------------------------
describe("submitVideoForTranscription", () => {
  it("envia o buffer de vídeo como multipart e retorna job_id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({ job_id: "job-abc123", status: "pending" }),
    });

    const result = await submitVideoForTranscription(
      Buffer.from("fake video content"),
      "gravacao.mp4"
    );

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toContain("/transcriptions/video");
    expect(options.method).toBe("POST");
    expect(options.headers["X-API-Key"]).toBeTruthy();
    expect(options.body).toBeInstanceOf(FormData);

    expect(result).toEqual({ jobId: "job-abc123", status: "pending" });
  });

  it("lança erro se a API retornar status não-ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    });

    await expect(
      submitVideoForTranscription(Buffer.from("video"), "video.mp4")
    ).rejects.toThrow("500");
  });
});

// ---------------------------------------------------------------------------
describe("getTranscriptionStatus", () => {
  it("retorna o status processing do job", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        job_id: "job-abc123",
        status: "processing",
        created_at: "2026-04-12T10:00:00",
        completed_at: null,
      }),
    });

    const result = await getTranscriptionStatus("job-abc123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
    expect(url).toContain("/transcriptions/job-abc123");
    expect(options.headers["X-API-Key"]).toBeTruthy();

    expect(result.status).toBe("processing");
    expect(result.jobId).toBe("job-abc123");
  });

  it("retorna status 'done' quando concluído", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        job_id: "job-abc123",
        status: "done",
        created_at: "2026-04-12T10:00:00",
        completed_at: "2026-04-12T10:05:00",
      }),
    });

    const result = await getTranscriptionStatus("job-abc123");
    expect(result.status).toBe("done");
    expect(result.completedAt).toBe("2026-04-12T10:05:00");
  });
});

// ---------------------------------------------------------------------------
describe("getTranscriptionResult", () => {
  it("retorna texto da transcrição quando status é done", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        job_id: "job-abc123",
        text: "Olá, bem-vindo à reunião de apresentação da proposta.",
        language: "pt",
        duration_seconds: 160.9,
      }),
    });

    const result = await getTranscriptionResult("job-abc123");

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain("/transcriptions/job-abc123/result");

    expect(result.text).toBe(
      "Olá, bem-vindo à reunião de apresentação da proposta."
    );
    expect(result.language).toBe("pt");
    expect(result.durationSeconds).toBe(160.9);
  });

  it("lança erro 409 se job ainda não está concluído", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      text: async () => "Job not done yet",
    });

    await expect(getTranscriptionResult("job-abc123")).rejects.toThrow("409");
  });
});
