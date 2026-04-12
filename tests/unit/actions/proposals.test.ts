/**
 * Proposals Actions Tests
 *
 * Tests for src/actions/proposals.ts
 * RULE: When a test fails, fix the IMPLEMENTATION, never the test.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    proposal: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lead: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/google/drive", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
  getFileUrl: vi.fn((id: string) => `https://drive.google.com/file/d/${id}/view`),
}));

vi.mock("@/lib/google/drive-folders", () => ({
  getLeadFolder: vi.fn(),
  getOrganizationFolder: vi.fn(),
}));

import {
  getProposals,
  createProposal,
  updateProposalStatus,
  deleteProposal,
} from "@/actions/proposals";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { uploadFile } from "@/lib/google/drive";
import { getLeadFolder } from "@/lib/google/drive-folders";

const mockGetServerSession = vi.mocked(getServerSession);
const mockProposalFindMany = vi.mocked(prisma.proposal.findMany);
const mockProposalFindUnique = vi.mocked(prisma.proposal.findUnique);
const mockProposalCreate = vi.mocked(prisma.proposal.create);
const mockProposalUpdate = vi.mocked(prisma.proposal.update);
const mockProposalDelete = vi.mocked(prisma.proposal.delete);
const mockUploadFile = vi.mocked(uploadFile);
const mockGetLeadFolder = vi.mocked(getLeadFolder);

const SESSION = { user: { id: "user-123", name: "Bruno", email: "b@wb.com", role: "admin" } };

const MOCK_PROPOSAL = {
  id: "proposal-1",
  title: "Proposta E-commerce",
  description: "Desenvolvimento completo",
  status: "draft",
  driveFileId: "drive-file-1",
  driveUrl: "https://drive.google.com/file/d/drive-file-1/view",
  fileName: "proposta.pdf",
  fileSize: 102400,
  sentAt: null,
  leadId: "lead-1",
  dealId: null,
  ownerId: "user-123",
  createdAt: new Date("2026-04-12"),
  updatedAt: new Date("2026-04-12"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue(SESSION as never);
  mockProposalFindMany.mockResolvedValue([MOCK_PROPOSAL] as never);
  mockProposalFindUnique.mockResolvedValue(MOCK_PROPOSAL as never);
  mockProposalCreate.mockResolvedValue(MOCK_PROPOSAL as never);
  mockProposalUpdate.mockResolvedValue({ ...MOCK_PROPOSAL, status: "sent" } as never);
  mockProposalDelete.mockResolvedValue(MOCK_PROPOSAL as never);
  mockUploadFile.mockResolvedValue({ id: "drive-file-1", webViewLink: "https://drive.google.com/drive-file-1" });
  mockGetLeadFolder.mockResolvedValue("lead-folder-id");
});

// ---------------------------------------------------------------------------
describe("getProposals", () => {
  it("retorna propostas do lead", async () => {
    const result = await getProposals({ leadId: "lead-1" });
    expect(result).toHaveLength(1);
    expect(mockProposalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ leadId: "lead-1" }),
      })
    );
  });

  it("lança erro se não autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(getProposals({ leadId: "lead-1" })).rejects.toThrow("Não autorizado");
  });
});

// ---------------------------------------------------------------------------
describe("createProposal", () => {
  it("cria proposta sem arquivo e salva no banco", async () => {
    const result = await createProposal({
      title: "Proposta E-commerce",
      leadId: "lead-1",
    });

    expect(mockProposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Proposta E-commerce",
          leadId: "lead-1",
          ownerId: "user-123",
          status: "draft",
        }),
      })
    );
    expect(result).toBeDefined();
  });

  it("faz upload para Drive quando fileBase64 fornecido", async () => {
    const fileBase64 = Buffer.from("fake pdf content").toString("base64");

    await createProposal({
      title: "Proposta",
      leadId: "lead-1",
      fileName: "proposta.pdf",
      fileMimeType: "application/pdf",
      fileBase64,
    });

    expect(mockGetLeadFolder).toHaveBeenCalledWith("lead-1", expect.any(String));
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "proposta.pdf",
        mimeType: "application/pdf",
        folderId: "lead-folder-id",
      })
    );
  });

  it("lança erro se não autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(createProposal({ title: "Proposta", leadId: "lead-1" })).rejects.toThrow(
      "Não autorizado"
    );
  });
});

// ---------------------------------------------------------------------------
describe("updateProposalStatus", () => {
  it("atualiza status para 'sent' e define sentAt", async () => {
    await updateProposalStatus("proposal-1", "sent");

    expect(mockProposalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "proposal-1" },
        data: expect.objectContaining({ status: "sent", sentAt: expect.any(Date) }),
      })
    );
  });

  it("atualiza status sem alterar sentAt para status != 'sent'", async () => {
    await updateProposalStatus("proposal-1", "accepted");

    const call = mockProposalUpdate.mock.calls[0][0];
    expect(call.data.status).toBe("accepted");
    // sentAt não deve ser sobrescrito quando não é 'sent'
    expect(call.data.sentAt).toBeUndefined();
  });

  it("verifica propriedade antes de atualizar", async () => {
    mockProposalFindUnique.mockResolvedValue({
      ...MOCK_PROPOSAL,
      ownerId: "outro-user",
    } as never);

    await expect(updateProposalStatus("proposal-1", "sent")).rejects.toThrow(
      "Acesso negado"
    );
  });
});

// ---------------------------------------------------------------------------
describe("deleteProposal", () => {
  it("remove a proposta do banco", async () => {
    await deleteProposal("proposal-1");
    expect(mockProposalDelete).toHaveBeenCalledWith({ where: { id: "proposal-1" } });
  });

  it("verifica propriedade antes de deletar", async () => {
    mockProposalFindUnique.mockResolvedValue({
      ...MOCK_PROPOSAL,
      ownerId: "outro-user",
    } as never);

    await expect(deleteProposal("proposal-1")).rejects.toThrow("Acesso negado");
  });
});
