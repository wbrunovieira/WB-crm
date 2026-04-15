/**
 * GoTo Check Recordings Cron Tests
 *
 * Tests for src/app/api/goto/check-recordings/route.ts
 * Pipeline: S3 → WB Transcritor (no Google Drive)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/goto/s3-recording", () => ({
  findRecordingKey: vi.fn(),
  findSiblingRecordingKey: vi.fn(),
  downloadRecordingFromS3: vi.fn(),
}));
vi.mock("@/lib/transcriptor", () => ({
  submitAudioForTranscription: vi.fn(),
  getTranscriptionStatus: vi.fn(),
  getTranscriptionResult: vi.fn(),
}));

import { findRecordingKey, findSiblingRecordingKey, downloadRecordingFromS3 } from "@/lib/goto/s3-recording";
import {
  submitAudioForTranscription,
  getTranscriptionStatus,
  getTranscriptionResult,
} from "@/lib/transcriptor";
import { prismaMock } from "../../setup";

const mockFindKey = vi.mocked(findRecordingKey);
const mockFindSibling = vi.mocked(findSiblingRecordingKey);
const mockDownload = vi.mocked(downloadRecordingFromS3);
const mockSubmit = vi.mocked(submitAudioForTranscription);
const mockStatus = vi.mocked(getTranscriptionStatus);
const mockResult = vi.mocked(getTranscriptionResult);

function makeRequest(secret = "test-secret"): NextRequest {
  return new NextRequest("http://localhost/api/goto/check-recordings", {
    headers: { "x-cron-secret": secret },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-secret";
  process.env.AWS_S3_GOTO_BUCKET = "wb-crm-goto-recordings";

  mockFindKey.mockResolvedValue("2026/04/12/timestamp~callId~phone~phone~rec-abc.mp3");
  mockFindSibling.mockResolvedValue(null); // sem track do cliente por padrão
  mockDownload.mockResolvedValue({ buffer: Buffer.from("audio"), contentType: "audio/mpeg" });
  mockSubmit.mockResolvedValue({ jobId: "job-abc", status: "pending" });
});

describe("GET /api/goto/check-recordings — auth", () => {
  it("retorna 401 sem x-cron-secret", async () => {
    const { GET } = await import("@/app/api/goto/check-recordings/route");
    const req = new NextRequest("http://localhost/api/goto/check-recordings");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("retorna 401 com secret incorreto", async () => {
    const { GET } = await import("@/app/api/goto/check-recordings/route");
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });
});

describe("Pass 1 — find in S3 + submit transcription", () => {
  it("processa activity com gotoRecordingId sem gotoRecordingUrl", async () => {
    prismaMock.activity.findMany
      .mockResolvedValueOnce([
        { id: "act-1", gotoRecordingId: "rec-abc", completedAt: new Date() },
      ] as never)
      .mockResolvedValueOnce([] as never);

    prismaMock.activity.update.mockResolvedValue({} as never);

    const { GET } = await import("@/app/api/goto/check-recordings/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockFindKey).toHaveBeenCalledWith("rec-abc", expect.any(Date));
    expect(mockDownload).toHaveBeenCalledWith("2026/04/12/timestamp~callId~phone~phone~rec-abc.mp3");
    expect(mockSubmit).toHaveBeenCalledWith(expect.any(Buffer), expect.stringContaining("act-1"));

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act-1" },
        data: expect.objectContaining({
          gotoRecordingUrl: "2026/04/12/timestamp~callId~phone~phone~rec-abc.mp3",
          gotoTranscriptionJobId: "job-abc",
        }),
      })
    );

    expect(body.pass1Processed).toBe(1);
  });

  it("marca s3_not_found_yet quando arquivo ainda não chegou no S3", async () => {
    mockFindKey.mockResolvedValue(null);

    prismaMock.activity.findMany
      .mockResolvedValueOnce([
        { id: "act-1", gotoRecordingId: "rec-abc", completedAt: new Date() },
      ] as never)
      .mockResolvedValueOnce([] as never);

    const { GET } = await import("@/app/api/goto/check-recordings/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockDownload).not.toHaveBeenCalled();
    expect(mockSubmit).not.toHaveBeenCalled();
    expect(body.results[0].action).toBe("s3_not_found_yet");
  });
});

describe("Pass 2 — poll transcription jobs", () => {
  it("salva transcript quando job está done", async () => {
    prismaMock.activity.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        { id: "act-2", gotoTranscriptionJobId: "job-done-123" },
      ] as never);

    mockStatus.mockResolvedValueOnce({ jobId: "job-done-123", status: "done" });
    mockResult.mockResolvedValueOnce({
      jobId: "job-done-123",
      text: "Olá, vamos falar sobre o contrato?",
      language: "pt",
      durationSeconds: 65,
      segments: [{ start: 0, end: 4.5, text: "Olá, vamos falar sobre o contrato?" }],
    });
    prismaMock.activity.update.mockResolvedValue({} as never);
    // getAgentName lookup
    prismaMock.user.findUnique.mockResolvedValue({ name: "Bruno" } as never);

    const { GET } = await import("@/app/api/goto/check-recordings/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act-2" },
        data: expect.objectContaining({
          // implementação salva JSON de segmentos com speaker attribution
          gotoTranscriptText: expect.stringContaining("Olá, vamos falar sobre o contrato?"),
          gotoTranscriptionJobId: null,
        }),
      })
    );
    expect(body.pass2Polled).toBe(1);
  });

  it("limpa jobId quando job falhou", async () => {
    prismaMock.activity.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ id: "act-3", gotoTranscriptionJobId: "job-fail" }] as never);

    mockStatus.mockResolvedValueOnce({ jobId: "job-fail", status: "failed", error: "timeout" });
    prismaMock.activity.update.mockResolvedValue({} as never);

    const { GET } = await import("@/app/api/goto/check-recordings/route");
    await GET(makeRequest());

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act-3" },
        data: expect.objectContaining({ gotoTranscriptionJobId: null }),
      })
    );
  });

  it("não altera activity quando job ainda está processing", async () => {
    prismaMock.activity.findMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([{ id: "act-4", gotoTranscriptionJobId: "job-proc" }] as never);

    mockStatus.mockResolvedValueOnce({ jobId: "job-proc", status: "processing" });

    const { GET } = await import("@/app/api/goto/check-recordings/route");
    await GET(makeRequest());

    expect(prismaMock.activity.update).not.toHaveBeenCalled();
  });
});
