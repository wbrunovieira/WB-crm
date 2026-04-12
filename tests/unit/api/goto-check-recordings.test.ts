/**
 * GoTo Check Recordings Cron Tests
 *
 * Tests for src/app/api/goto/check-recordings/route.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/goto/recording-downloader", () => ({
  downloadCallRecording: vi.fn(),
}));
vi.mock("@/lib/google/goto-drive-uploader", () => ({
  uploadCallRecordingToDrive: vi.fn(),
}));
vi.mock("@/lib/transcriptor", () => ({
  submitAudioForTranscription: vi.fn(),
  getTranscriptionStatus: vi.fn(),
  getTranscriptionResult: vi.fn(),
}));

import { downloadCallRecording } from "@/lib/goto/recording-downloader";
import { uploadCallRecordingToDrive } from "@/lib/google/goto-drive-uploader";
import {
  submitAudioForTranscription,
  getTranscriptionStatus,
  getTranscriptionResult,
} from "@/lib/transcriptor";
import { prismaMock } from "../../setup";

const mockDownload = vi.mocked(downloadCallRecording);
const mockUpload = vi.mocked(uploadCallRecordingToDrive);
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

  mockDownload.mockResolvedValue({ buffer: Buffer.from("audio"), contentType: "audio/mpeg" });
  mockUpload.mockResolvedValue({
    fileId: "drive-file-xyz",
    webViewLink: "https://drive.google.com/file/d/drive-file-xyz/view",
  });
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

describe("Pass 1 — download + upload + submit transcription", () => {
  it("processa activity com gotoRecordingId sem Drive ID", async () => {
    prismaMock.activity.findMany
      .mockResolvedValueOnce([
        {
          id: "act-1",
          gotoRecordingId: "rec-abc",
          subject: "Ligação realizada",
        },
      ] as never)
      .mockResolvedValueOnce([] as never); // Pass 2: no pending jobs

    prismaMock.activity.update.mockResolvedValue({} as never);

    const { GET } = await import("@/app/api/goto/check-recordings/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockDownload).toHaveBeenCalledWith("rec-abc");
    expect(mockUpload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining("act-1"),
      "audio/mpeg"
    );
    expect(mockSubmit).toHaveBeenCalled();

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act-1" },
        data: expect.objectContaining({
          gotoRecordingDriveId: "drive-file-xyz",
          gotoRecordingUrl: "https://drive.google.com/file/d/drive-file-xyz/view",
          gotoTranscriptionJobId: "job-abc",
        }),
      })
    );

    expect(body.pass1Processed).toBe(1);
  });
});

describe("Pass 2 — poll transcription jobs", () => {
  it("salva transcript quando job está done", async () => {
    prismaMock.activity.findMany
      .mockResolvedValueOnce([] as never) // Pass 1: no pending downloads
      .mockResolvedValueOnce([
        { id: "act-2", gotoTranscriptionJobId: "job-done-123" },
      ] as never);

    mockStatus.mockResolvedValueOnce({
      jobId: "job-done-123",
      status: "done",
    });
    mockResult.mockResolvedValueOnce({
      jobId: "job-done-123",
      text: "Olá, vamos falar sobre o contrato?",
      language: "pt",
      durationSeconds: 65,
    });
    prismaMock.activity.update.mockResolvedValue({} as never);

    const { GET } = await import("@/app/api/goto/check-recordings/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(prismaMock.activity.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "act-2" },
        data: expect.objectContaining({
          gotoTranscriptText: "Olá, vamos falar sobre o contrato?",
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
