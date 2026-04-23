import { describe, it, expect, beforeEach, vi } from "vitest";
import { GoogleDriveService } from "@/infra/shared/google-drive/google-drive.service";

const mockFilesCreate = vi.fn();
const mockFilesList = vi.fn();
const mockDrive = { files: { create: mockFilesCreate, list: mockFilesList } };
const mockRefreshAccessToken = vi.fn();
const mockSetCredentials = vi.fn();
const mockOAuth2Instance = {
  setCredentials: mockSetCredentials,
  refreshAccessToken: mockRefreshAccessToken,
};

vi.mock("googleapis", () => ({
  google: {
    auth: { OAuth2: vi.fn(() => mockOAuth2Instance) },
    drive: vi.fn(() => mockDrive),
  },
}));

const VALID_TOKEN = {
  id: "token-1",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

function makePrisma(token: typeof VALID_TOKEN | null = VALID_TOKEN) {
  return {
    googleToken: {
      findFirst: vi.fn().mockResolvedValue(token),
      update: vi.fn().mockResolvedValue(null),
    },
  };
}

describe("GoogleDriveService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("uploadFile", () => {
    it("throws when no Google token is configured", async () => {
      const svc = new GoogleDriveService(makePrisma(null) as any);
      await expect(
        svc.uploadFile({ name: "file.pdf", mimeType: "application/pdf", content: Buffer.from("data") }),
      ).rejects.toThrow("Google token not configured");
    });

    it("uploads file and returns id and webViewLink", async () => {
      mockFilesCreate.mockResolvedValue({
        data: { id: "drive-file-123", webViewLink: "https://drive.google.com/file/d/drive-file-123/view" },
      });
      const svc = new GoogleDriveService(makePrisma() as any);
      const result = await svc.uploadFile({
        name: "proposta.pdf",
        mimeType: "application/pdf",
        content: Buffer.from("pdf content"),
      });
      expect(result).toEqual({
        id: "drive-file-123",
        webViewLink: "https://drive.google.com/file/d/drive-file-123/view",
      });
    });

    it("includes parents when folderId is provided", async () => {
      mockFilesCreate.mockResolvedValue({ data: { id: "file-id", webViewLink: "https://link" } });
      const svc = new GoogleDriveService(makePrisma() as any);
      await svc.uploadFile({
        name: "doc.pdf",
        mimeType: "application/pdf",
        content: Buffer.from(""),
        folderId: "folder-abc",
      });
      expect(mockFilesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({ parents: ["folder-abc"] }),
        }),
      );
    });

    it("does not include parents when folderId is omitted", async () => {
      mockFilesCreate.mockResolvedValue({ data: { id: "file-id", webViewLink: "https://link" } });
      const svc = new GoogleDriveService(makePrisma() as any);
      await svc.uploadFile({ name: "doc.pdf", mimeType: "application/pdf", content: Buffer.from("") });
      const call = mockFilesCreate.mock.calls[0][0];
      expect(call.requestBody.parents).toBeUndefined();
    });

    it("refreshes token when it expires within 5 minutes", async () => {
      const expiringSoon = { ...VALID_TOKEN, expiresAt: new Date(Date.now() + 2 * 60 * 1000) };
      mockRefreshAccessToken.mockResolvedValue({
        credentials: { access_token: "new-token", expiry_date: Date.now() + 3_600_000 },
      });
      mockFilesCreate.mockResolvedValue({ data: { id: "x", webViewLink: "https://x" } });
      const prisma = makePrisma(expiringSoon);
      const svc = new GoogleDriveService(prisma as any);
      await svc.uploadFile({ name: "f.pdf", mimeType: "application/pdf", content: Buffer.from("") });
      expect(mockRefreshAccessToken).toHaveBeenCalled();
      expect(prisma.googleToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ accessToken: "new-token" }) }),
      );
    });
  });

  describe("getOrCreateFolder", () => {
    it("throws when no Google token is configured", async () => {
      const svc = new GoogleDriveService(makePrisma(null) as any);
      await expect(svc.getOrCreateFolder("WB-CRM")).rejects.toThrow("Google token not configured");
    });

    it("returns existing folder id when found in Drive", async () => {
      mockFilesList.mockResolvedValue({ data: { files: [{ id: "existing-folder-id" }] } });
      const svc = new GoogleDriveService(makePrisma() as any);
      const result = await svc.getOrCreateFolder("WB-CRM");
      expect(result).toBe("existing-folder-id");
      expect(mockFilesCreate).not.toHaveBeenCalled();
    });

    it("creates folder and returns new id when not found", async () => {
      mockFilesList.mockResolvedValue({ data: { files: [] } });
      mockFilesCreate.mockResolvedValue({ data: { id: "new-folder-id" } });
      const svc = new GoogleDriveService(makePrisma() as any);
      const result = await svc.getOrCreateFolder("WB-CRM");
      expect(result).toBe("new-folder-id");
      expect(mockFilesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({
            mimeType: "application/vnd.google-apps.folder",
            name: "WB-CRM",
          }),
        }),
      );
    });

    it("includes parentId in folder creation when provided", async () => {
      mockFilesList.mockResolvedValue({ data: { files: [] } });
      mockFilesCreate.mockResolvedValue({ data: { id: "child-folder-id" } });
      const svc = new GoogleDriveService(makePrisma() as any);
      await svc.getOrCreateFolder("Propostas", "parent-folder-id");
      expect(mockFilesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requestBody: expect.objectContaining({ parents: ["parent-folder-id"] }),
        }),
      );
    });

    it("includes parentId in search query when provided", async () => {
      mockFilesList.mockResolvedValue({ data: { files: [{ id: "found-id" }] } });
      const svc = new GoogleDriveService(makePrisma() as any);
      await svc.getOrCreateFolder("Sub", "parent-id");
      const q: string = mockFilesList.mock.calls[0][0].q;
      expect(q).toContain("'parent-id' in parents");
    });
  });
});
