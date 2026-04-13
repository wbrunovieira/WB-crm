/**
 * Evolution Check Transcriptions Cron Tests (TDD)
 *
 * Tests for GET /api/evolution/check-transcriptions
 * - Autentica via CRON_SECRET
 * - Ignora WhatsAppMessages sem jobId pendente
 * - Salta jobs ainda em processamento (pending/processing)
 * - Salva transcrição quando job está done
 * - Atribui speaker: fromMe=true → nome do agente; fromMe=false → senderName
 * - Lida com falha do job (failed) — limpa jobId sem salvar transcript
 * - Não lança erro se polling do job falhar (resiliência)
 *
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { prismaMock } from "../../setup";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/transcriptor", () => ({
  getTranscriptionStatus: vi.fn(),
  getTranscriptionResult: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getTranscriptionStatus, getTranscriptionResult } from "@/lib/transcriptor";

const mockStatus = vi.mocked(getTranscriptionStatus);
const mockResult = vi.mocked(getTranscriptionResult);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CRON_SECRET = "test-cron-secret-123";

function makeRequest(): NextRequest {
  return new NextRequest("http://localhost/api/evolution/check-transcriptions", {
    headers: { "x-cron-secret": CRON_SECRET },
  });
}

function makeUnauthorizedRequest(): NextRequest {
  return new NextRequest("http://localhost/api/evolution/check-transcriptions");
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = CRON_SECRET;

  prismaMock.whatsAppMessage.findMany.mockResolvedValue([]);
  prismaMock.whatsAppMessage.update.mockResolvedValue({} as any);
  prismaMock.user.findUnique.mockResolvedValue({ id: "user-1", name: "Bruno Silva" } as any);
});

// ─── Autenticação ─────────────────────────────────────────────────────────────

describe("GET /api/evolution/check-transcriptions — auth", () => {
  it("retorna 401 sem header de autenticação", async () => {
    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    const res = await GET(makeUnauthorizedRequest());

    expect(res.status).toBe(401);
  });

  it("retorna 200 com header correto", async () => {
    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
  });
});

// ─── Polling de jobs ─────────────────────────────────────────────────────────

describe("GET /api/evolution/check-transcriptions — polling", () => {
  it("não processa quando não há mensagens com jobs pendentes", async () => {
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([]);

    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.polled).toBe(0);
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it("pula jobs ainda em processamento", async () => {
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([
      {
        id: "wamsg-1",
        mediaTranscriptionJobId: "job-pending",
        fromMe: false,
        ownerId: "user-1",
        pushName: "João",
      },
    ] as any);

    mockStatus.mockResolvedValueOnce({ jobId: "job-pending", status: "processing" });

    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.results[0].action).toBe("transcription_pending");
    expect(prismaMock.whatsAppMessage.update).not.toHaveBeenCalled();
  });

  it("salva transcrição quando job está done", async () => {
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([
      {
        id: "wamsg-2",
        mediaTranscriptionJobId: "job-done",
        fromMe: false,
        ownerId: "user-1",
        pushName: "Maria",
      },
    ] as any);

    mockStatus.mockResolvedValueOnce({ jobId: "job-done", status: "done" });
    mockResult.mockResolvedValueOnce({
      jobId: "job-done",
      text: "Olá, quero saber sobre o produto.",
      language: "pt",
      durationSeconds: 8,
      segments: [],
    });

    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.results[0].action).toBe("transcription_saved");

    expect(prismaMock.whatsAppMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wamsg-2" },
        data: expect.objectContaining({
          mediaTranscriptText: expect.stringContaining("Olá, quero saber sobre o produto."),
          mediaTranscriptionJobId: null,
        }),
      })
    );
  });

  it("atribui speaker 'Maria' (fromMe=false) na transcrição", async () => {
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([
      {
        id: "wamsg-3",
        mediaTranscriptionJobId: "job-done-2",
        fromMe: false,
        ownerId: "user-1",
        pushName: "Maria",
      },
    ] as any);

    mockStatus.mockResolvedValueOnce({ jobId: "job-done-2", status: "done" });
    mockResult.mockResolvedValueOnce({
      jobId: "job-done-2",
      text: "Quero comprar",
      language: "pt",
      durationSeconds: 3,
      segments: [],
    });

    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    await GET(makeRequest());

    const updateCall = prismaMock.whatsAppMessage.update.mock.calls[0][0];
    expect(updateCall.data.mediaTranscriptText).toContain("Maria");
  });

  it("atribui speaker do agente (fromMe=true) na transcrição", async () => {
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([
      {
        id: "wamsg-4",
        mediaTranscriptionJobId: "job-done-3",
        fromMe: true,
        ownerId: "user-1",
        pushName: "Eu",
      },
    ] as any);

    mockStatus.mockResolvedValueOnce({ jobId: "job-done-3", status: "done" });
    mockResult.mockResolvedValueOnce({
      jobId: "job-done-3",
      text: "Vou te enviar a proposta",
      language: "pt",
      durationSeconds: 4,
      segments: [],
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({ id: "user-1", name: "Bruno Silva" } as any);

    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    await GET(makeRequest());

    const updateCall = prismaMock.whatsAppMessage.update.mock.calls[0][0];
    expect(updateCall.data.mediaTranscriptText).toContain("Bruno Silva");
  });

  it("limpa jobId quando job falhou (sem salvar transcript)", async () => {
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([
      {
        id: "wamsg-5",
        mediaTranscriptionJobId: "job-failed",
        fromMe: false,
        ownerId: "user-1",
        pushName: "Pedro",
      },
    ] as any);

    mockStatus.mockResolvedValueOnce({ jobId: "job-failed", status: "failed" });

    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.results[0].action).toBe("transcription_failed");

    expect(prismaMock.whatsAppMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          mediaTranscriptionJobId: null,
        }),
      })
    );
    // Transcript text should NOT be set
    const updateData = prismaMock.whatsAppMessage.update.mock.calls[0][0].data;
    expect(updateData.mediaTranscriptText).toBeUndefined();
  });

  it("não lança erro se polling do job falhar (resiliência)", async () => {
    prismaMock.whatsAppMessage.findMany.mockResolvedValue([
      {
        id: "wamsg-6",
        mediaTranscriptionJobId: "job-error",
        fromMe: false,
        ownerId: "user-1",
        pushName: "Ana",
      },
    ] as any);

    mockStatus.mockRejectedValueOnce(new Error("Transcriptor timeout"));

    const { GET } = await import("@/app/api/evolution/check-transcriptions/route");
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results[0].action).toBe("error");
  });
});
