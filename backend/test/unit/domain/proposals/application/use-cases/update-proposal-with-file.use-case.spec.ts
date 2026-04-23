import { describe, it, expect, beforeEach, vi } from "vitest";
import { UpdateProposalWithFileUseCase } from "@/domain/proposals/application/use-cases/update-proposal-with-file.use-case";
import { InMemoryProposalsRepository } from "../../fakes/in-memory-proposals.repository";
import { CreateProposalUseCase } from "@/domain/proposals/application/use-cases/proposals.use-cases";

const mockGetOrCreateFolder = vi.fn();
const mockUploadFile = vi.fn();
const mockDeleteFile = vi.fn();
const mockDrive = {
  getOrCreateFolder: mockGetOrCreateFolder,
  uploadFile: mockUploadFile,
  deleteFile: mockDeleteFile,
};

const mockFindLead = vi.fn();
const mockUpdateLead = vi.fn();
const mockPrisma = {
  lead: { findUnique: mockFindLead, update: mockUpdateLead },
};

describe("UpdateProposalWithFileUseCase", () => {
  let repo: InMemoryProposalsRepository;
  let uc: UpdateProposalWithFileUseCase;
  let create: CreateProposalUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new InMemoryProposalsRepository();
    create = new CreateProposalUseCase(repo);
    uc = new UpdateProposalWithFileUseCase(repo, mockDrive as any, mockPrisma as any);
  });

  it("returns left when proposal not found", async () => {
    const r = await uc.execute({ id: "missing", requesterId: "u1", requesterRole: "sdr", title: "X" });
    expect(r.isLeft()).toBe(true);
  });

  it("returns left when requester is not owner", async () => {
    const created = await create.execute({ title: "Original", ownerId: "u1" });
    const id = created.unwrap().id.toString();
    const r = await uc.execute({ id, requesterId: "u2", requesterRole: "sdr", title: "Hack" });
    expect(r.isLeft()).toBe(true);
  });

  it("updates title and description without touching Drive", async () => {
    const created = await create.execute({ title: "Original", ownerId: "u1" });
    const id = created.unwrap().id.toString();
    const r = await uc.execute({ id, requesterId: "u1", requesterRole: "sdr", title: "Novo título", description: "Nova desc" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().title).toBe("Novo título");
    expect(mockUploadFile).not.toHaveBeenCalled();
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it("uploads new file, updates driveFileId and fileSize", async () => {
    const created = await create.execute({ title: "P", ownerId: "u1" });
    const id = created.unwrap().id.toString();
    mockFindLead.mockResolvedValue({ driveFolderId: "folder-abc", businessName: "Acme" });
    mockUploadFile.mockResolvedValue({ id: "new-drive-id", webViewLink: "https://drive.google.com/new" });

    const content = Buffer.from("new pdf");
    const r = await uc.execute({
      id, requesterId: "u1", requesterRole: "sdr",
      title: "P",
      leadId: "lead-1",
      fileName: "updated.pdf",
      fileMimeType: "application/pdf",
      fileBase64: content.toString("base64"),
    });

    expect(r.isRight()).toBe(true);
    const p = r.unwrap();
    expect(p.driveFileId).toBe("new-drive-id");
    expect(p.fileSize).toBe(content.length);
    expect(mockUploadFile).toHaveBeenCalledOnce();
  });

  it("deletes old Drive file when replacing with a new one", async () => {
    const created = await create.execute({
      title: "P", ownerId: "u1", driveFileId: "old-file-id",
    });
    const id = created.unwrap().id.toString();
    mockFindLead.mockResolvedValue({ driveFolderId: "folder-abc", businessName: "Acme" });
    mockUploadFile.mockResolvedValue({ id: "new-id", webViewLink: "https://new" });
    mockDeleteFile.mockResolvedValue(undefined);

    const r = await uc.execute({
      id, requesterId: "u1", requesterRole: "sdr",
      title: "P", leadId: "lead-1",
      fileName: "new.pdf", fileMimeType: "application/pdf",
      fileBase64: Buffer.from("x").toString("base64"),
    });

    expect(r.isRight()).toBe(true);
    expect(mockDeleteFile).toHaveBeenCalledWith("old-file-id");
  });

  it("admin can update any proposal", async () => {
    const created = await create.execute({ title: "P", ownerId: "u1" });
    const id = created.unwrap().id.toString();
    const r = await uc.execute({ id, requesterId: "admin-user", requesterRole: "admin", title: "Admin edit" });
    expect(r.isRight()).toBe(true);
  });
});
