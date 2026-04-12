/**
 * GoTo Drive Uploader Tests
 *
 * Tests for src/lib/google/goto-drive-uploader.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/google/drive", () => ({
  getOrCreateFolder: vi.fn(),
  uploadFile: vi.fn(),
}));

import { uploadCallRecordingToDrive } from "@/lib/google/goto-drive-uploader";
import { getOrCreateFolder, uploadFile } from "@/lib/google/drive";

const mockGetOrCreateFolder = vi.mocked(getOrCreateFolder);
const mockUploadFile = vi.mocked(uploadFile);

beforeEach(() => {
  vi.clearAllMocks();
  // Drive folder hierarchy: WB-CRM → GoTo → Gravações
  mockGetOrCreateFolder
    .mockResolvedValueOnce("root-folder-id")    // WB-CRM
    .mockResolvedValueOnce("goto-folder-id")    // GoTo
    .mockResolvedValueOnce("recordings-folder-id"); // Gravações

  mockUploadFile.mockResolvedValue({
    id: "drive-file-abc123",
    webViewLink: "https://drive.google.com/file/d/drive-file-abc123/view",
  });
});

describe("uploadCallRecordingToDrive", () => {
  it("cria hierarquia WB-CRM/GoTo/Gravações/ e retorna fileId e webViewLink", async () => {
    const buffer = Buffer.from("audio data");
    const result = await uploadCallRecordingToDrive(buffer, "ligacao-123.mp3", "audio/mpeg");

    expect(result.fileId).toBe("drive-file-abc123");
    expect(result.webViewLink).toBe("https://drive.google.com/file/d/drive-file-abc123/view");

    // Verifica hierarquia de pastas
    expect(mockGetOrCreateFolder).toHaveBeenCalledWith("WB-CRM", undefined);
    expect(mockGetOrCreateFolder).toHaveBeenCalledWith("GoTo", "root-folder-id");
    expect(mockGetOrCreateFolder).toHaveBeenCalledWith("Gravações", "goto-folder-id");
  });

  it("faz upload do arquivo na pasta Gravações com mimeType correto", async () => {
    const buffer = Buffer.from("wav audio");
    await uploadCallRecordingToDrive(buffer, "call-xyz.wav", "audio/wav");

    expect(mockUploadFile).toHaveBeenCalledWith({
      name: "call-xyz.wav",
      mimeType: "audio/wav",
      content: buffer,
      folderId: "recordings-folder-id",
    });
  });

  it("reutiliza pastas existentes (não duplica) — só chama getOrCreateFolder 3x", async () => {
    const buffer = Buffer.from("x");
    await uploadCallRecordingToDrive(buffer, "a.mp3", "audio/mpeg");

    // Exatamente 3 chamadas (WB-CRM, GoTo, Gravações) — não mais
    expect(mockGetOrCreateFolder).toHaveBeenCalledTimes(3);
  });
});
