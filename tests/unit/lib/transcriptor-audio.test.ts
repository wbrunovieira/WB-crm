/**
 * Transcriptor Audio Tests
 *
 * Tests for submitAudioForTranscription in src/lib/transcriptor.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Must import after stubbing fetch
import { submitAudioForTranscription } from "@/lib/transcriptor";

beforeEach(() => {
  vi.clearAllMocks();
  process.env.TRANSCRIPTOR_BASE_URL = "https://transcritor.wbdigitalsolutions.com";
  process.env.TRANSCRIPTOR_API_KEY = "test-api-key";
});

describe("submitAudioForTranscription", () => {
  it("envia multipart/form-data para POST /transcriptions/audio e retorna jobId", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: "audio-job-123", status: "pending" }),
    });

    const buffer = Buffer.from("fake audio data");
    const result = await submitAudioForTranscription(buffer, "call-abc.mp3");

    expect(result).toEqual({ jobId: "audio-job-123", status: "pending" });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://transcritor.wbdigitalsolutions.com/transcriptions/audio",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-Key": "test-api-key" }),
      })
    );
  });

  it("passa o arquivo com o nome correto no FormData", async () => {
    let capturedBody: FormData | undefined;
    mockFetch.mockImplementationOnce((_url: string, opts: RequestInit) => {
      capturedBody = opts.body as FormData;
      return Promise.resolve({
        ok: true,
        json: async () => ({ job_id: "j1", status: "pending" }),
      });
    });

    const buffer = Buffer.from("audio bytes");
    await submitAudioForTranscription(buffer, "reuniao-abc.mp3");

    expect(capturedBody).toBeDefined();
    // FormData deve conter campo "file"
    const file = capturedBody!.get("file") as File;
    expect(file).toBeDefined();
    expect(file.name).toBe("reuniao-abc.mp3");
  });

  it("lança erro se a API retornar status não-ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    const buffer = Buffer.from("audio");
    await expect(submitAudioForTranscription(buffer, "call.mp3")).rejects.toThrow(
      "401"
    );
  });

  it("usa a URL base da variável de ambiente", async () => {
    process.env.TRANSCRIPTOR_BASE_URL = "https://custom-transcriptor.example.com";
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ job_id: "j2", status: "pending" }),
    });

    await submitAudioForTranscription(Buffer.from("x"), "x.mp3");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://custom-transcriptor.example.com/transcriptions/audio",
      expect.anything()
    );
  });
});
