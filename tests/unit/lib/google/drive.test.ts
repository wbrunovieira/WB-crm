/**
 * Google Drive Tests
 *
 * Tests for src/lib/google/drive.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/google/auth", () => ({
  getAuthenticatedClient: vi.fn(),
}));

import {
  getOrCreateFolder,
  uploadFile,
  getFileUrl,
  deleteFile,
} from "@/lib/google/drive";
import { getAuthenticatedClient } from "@/lib/google/auth";

const mockGetAuthenticatedClient = vi.mocked(getAuthenticatedClient);

function makeMockDriveClient(overrides: Record<string, unknown> = {}) {
  return {
    files: {
      list: vi.fn().mockResolvedValue({ data: { files: [] } }),
      create: vi.fn().mockResolvedValue({
        data: { id: "folder-123", webViewLink: "https://drive.google.com/folder-123" },
      }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      ...overrides,
    },
  };
}

function makeAuthClient(driveClient: ReturnType<typeof makeMockDriveClient>) {
  return {
    // getAuthenticatedClient returns an OAuth2Client; drive() uses it internally
    _driveClient: driveClient,
  };
}

// We need to mock googleapis drive() call
vi.mock("googleapis", () => {
  const driveClientMock = {
    files: {
      list: vi.fn().mockResolvedValue({ data: { files: [] } }),
      create: vi.fn().mockResolvedValue({
        data: { id: "folder-123", webViewLink: "https://drive.google.com/folder-123" },
      }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
    },
  };

  return {
    google: {
      drive: vi.fn(() => driveClientMock),
      auth: { OAuth2: vi.fn() },
    },
    __driveClientMock: driveClientMock,
  };
});

import { google } from "googleapis";

function getDriveMock() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (google.drive as any)() as ReturnType<typeof makeMockDriveClient>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAuthenticatedClient.mockResolvedValue({} as never);
  // Reset drive mock to default state
  const drive = getDriveMock();
  drive.files.list.mockResolvedValue({ data: { files: [] } });
  drive.files.create.mockResolvedValue({
    data: { id: "folder-123", webViewLink: "https://drive.google.com/folder-123" },
  });
  drive.files.delete.mockResolvedValue({ data: {} });
});

// ---------------------------------------------------------------------------
describe("getOrCreateFolder", () => {
  it("cria nova pasta quando não existe", async () => {
    const drive = getDriveMock();
    drive.files.list.mockResolvedValue({ data: { files: [] } });
    drive.files.create.mockResolvedValue({
      data: { id: "new-folder-id", webViewLink: "https://drive.google.com/new-folder-id" },
    });

    const result = await getOrCreateFolder("Propostas");

    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: "Propostas",
          mimeType: "application/vnd.google-apps.folder",
        }),
      })
    );
    expect(result).toBe("new-folder-id");
  });

  it("retorna pasta existente sem criar nova", async () => {
    const drive = getDriveMock();
    drive.files.list.mockResolvedValue({
      data: { files: [{ id: "existing-folder-id" }] },
    });

    const result = await getOrCreateFolder("Propostas");

    expect(drive.files.create).not.toHaveBeenCalled();
    expect(result).toBe("existing-folder-id");
  });

  it("usa parentId quando fornecido", async () => {
    const drive = getDriveMock();
    drive.files.list.mockResolvedValue({ data: { files: [] } });
    drive.files.create.mockResolvedValue({
      data: { id: "child-folder-id" },
    });

    await getOrCreateFolder("Nome do Lead", "parent-folder-id");

    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          parents: ["parent-folder-id"],
        }),
      })
    );
  });
});

// ---------------------------------------------------------------------------
describe("uploadFile", () => {
  it("faz upload e retorna id e url", async () => {
    const drive = getDriveMock();
    drive.files.create.mockResolvedValue({
      data: { id: "file-abc", webViewLink: "https://drive.google.com/file-abc" },
    });

    const result = await uploadFile({
      name: "proposta.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("pdf content"),
      folderId: "folder-123",
    });

    expect(drive.files.create).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({
          name: "proposta.pdf",
          parents: ["folder-123"],
        }),
        fields: "id,webViewLink",
      })
    );
    expect(result).toEqual({ id: "file-abc", webViewLink: "https://drive.google.com/file-abc" });
  });
});

// ---------------------------------------------------------------------------
describe("getFileUrl", () => {
  it("retorna URL de visualização do Drive", () => {
    const url = getFileUrl("file-abc-123");
    expect(url).toContain("file-abc-123");
    expect(url).toContain("drive.google.com");
  });
});

// ---------------------------------------------------------------------------
describe("deleteFile", () => {
  it("chama files.delete com o fileId correto", async () => {
    const drive = getDriveMock();

    await deleteFile("file-abc");

    expect(drive.files.delete).toHaveBeenCalledWith({ fileId: "file-abc" });
  });
});
