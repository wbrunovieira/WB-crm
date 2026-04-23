import { describe, it, expect, beforeEach, vi } from "vitest";
import { UploadProposalUseCase } from "@/domain/proposals/application/use-cases/upload-proposal.use-case";
import { InMemoryProposalsRepository } from "../../fakes/in-memory-proposals.repository";

const mockGetOrCreateFolder = vi.fn();
const mockUploadFile = vi.fn();
const mockDrive = {
  getOrCreateFolder: mockGetOrCreateFolder,
  uploadFile: mockUploadFile,
};

const mockFindLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockPrisma = {
  lead: { findUnique: mockFindLead, update: mockUpdateLead },
};

describe("UploadProposalUseCase", () => {
  let repo: InMemoryProposalsRepository;
  let uc: UploadProposalUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new InMemoryProposalsRepository();
    uc = new UploadProposalUseCase(repo, mockDrive as any, mockPrisma as any);
  });

  it("creates proposal without file when no fileBase64 provided", async () => {
    const r = await uc.execute({ title: "Sem arquivo", ownerId: "u1" });
    expect(r.isRight()).toBe(true);
    const p = r.unwrap();
    expect(p.driveFileId).toBeUndefined();
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("uploads file to Drive and saves driveFileId + driveUrl + fileSize", async () => {
    mockGetOrCreateFolder.mockResolvedValue("folder-id");
    mockUploadFile.mockResolvedValue({ id: "drive-file-123", webViewLink: "https://drive.google.com/file/d/123" });
    mockFindLead.mockResolvedValue({ driveFolderId: null, businessName: "Acme" });
    mockUpdateLead.mockResolvedValue(null);

    const content = Buffer.from("pdf content");
    const r = await uc.execute({
      title: "Proposta Acme",
      ownerId: "u1",
      leadId: "lead-1",
      fileName: "proposta.pdf",
      fileMimeType: "application/pdf",
      fileBase64: content.toString("base64"),
    });

    expect(r.isRight()).toBe(true);
    const p = r.unwrap();
    expect(p.driveFileId).toBe("drive-file-123");
    expect(p.driveUrl).toBe("https://drive.google.com/file/d/123");
    expect(p.fileSize).toBe(content.length);
    expect(p.fileName).toBe("proposta.pdf");
    expect(mockUploadFile).toHaveBeenCalledWith(expect.objectContaining({
      name: "proposta.pdf",
      mimeType: "application/pdf",
    }));
  });

  it("reuses existing driveFolderId from lead without creating new folder", async () => {
    mockFindLead.mockResolvedValue({ driveFolderId: "existing-folder", businessName: "Acme" });
    mockUploadFile.mockResolvedValue({ id: "file-id", webViewLink: "https://drive.google.com/x" });

    await uc.execute({
      title: "P",
      ownerId: "u1",
      leadId: "lead-1",
      fileName: "f.pdf",
      fileMimeType: "application/pdf",
      fileBase64: Buffer.from("x").toString("base64"),
    });

    expect(mockUploadFile).toHaveBeenCalledWith(expect.objectContaining({ folderId: "existing-folder" }));
    expect(mockUpdateLead).not.toHaveBeenCalled();
  });

  it("creates folder hierarchy WB-CRM → Propostas → leadName and persists folderId", async () => {
    mockFindLead.mockResolvedValue({ driveFolderId: null, businessName: "Empresa X" });
    mockGetOrCreateFolder
      .mockResolvedValueOnce("root-id")      // WB-CRM
      .mockResolvedValueOnce("proposals-id") // Propostas
      .mockResolvedValueOnce("lead-folder"); // Empresa X
    mockUploadFile.mockResolvedValue({ id: "fid", webViewLink: "https://url" });
    mockUpdateLead.mockResolvedValue(null);

    await uc.execute({
      title: "P",
      ownerId: "u1",
      leadId: "lead-1",
      fileName: "f.pdf",
      fileMimeType: "application/pdf",
      fileBase64: Buffer.from("x").toString("base64"),
    });

    expect(mockGetOrCreateFolder).toHaveBeenNthCalledWith(1, "WB-CRM", undefined);
    expect(mockGetOrCreateFolder).toHaveBeenNthCalledWith(2, "Propostas", "root-id");
    expect(mockGetOrCreateFolder).toHaveBeenNthCalledWith(3, "Empresa X", "proposals-id");
    expect(mockUpdateLead).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "lead-1" },
      data: { driveFolderId: "lead-folder" },
    }));
  });

  it("returns left on empty title", async () => {
    const r = await uc.execute({ title: "", ownerId: "u1" });
    expect(r.isLeft()).toBe(true);
  });
});
