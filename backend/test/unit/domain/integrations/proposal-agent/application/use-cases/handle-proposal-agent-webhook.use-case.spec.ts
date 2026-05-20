import { describe, it, expect, beforeEach, vi } from "vitest";
import { HandleProposalAgentWebhookUseCase } from "@/domain/integrations/proposal-agent/application/use-cases/handle-proposal-agent-webhook.use-case";
import { InMemoryProposalsRepository } from "../../fakes/in-memory-proposals.repository";
import { Proposal } from "@/domain/proposals/enterprise/entities/proposal";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { GoogleDrivePort } from "@/domain/integrations/whatsapp/application/ports/google-drive.port";

const fakeDrive = {
  uploadFile: vi.fn().mockResolvedValue({ id: "fake-drive-id", webViewLink: "https://drive.google.com/file/fake" }),
  deleteFile: vi.fn().mockResolvedValue(undefined),
  getOrCreateFolder: vi.fn().mockResolvedValue("fake-folder-id"),
} as unknown as GoogleDrivePort;

function makeProposal(id = "prop-1", agentJobId = "job-1") {
  const p = Proposal.create({
    title: "Proposta Teste",
    ownerId: "user-1",
    leadId: "lead-1",
    agentJobId,
    agentStatus: "processing",
  }, new UniqueEntityID(id)).unwrap();
  return p;
}

describe("HandleProposalAgentWebhookUseCase", () => {
  let repo: InMemoryProposalsRepository;
  let sut: HandleProposalAgentWebhookUseCase;

  beforeEach(() => {
    repo = new InMemoryProposalsRepository();
    sut = new HandleProposalAgentWebhookUseCase(repo, fakeDrive);
  });

  it("retorna erro se proposta não encontrada", async () => {
    const result = await sut.execute({ jobId: "unknown", status: "question", question: "Q?" });
    expect(result.isLeft()).toBe(true);
  });

  it("atualiza status para awaiting_answer quando recebe pergunta", async () => {
    repo.items.push(makeProposal());

    const result = await sut.execute({
      jobId: "job-1",
      status: "question",
      question: "Qual é o prazo esperado?",
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items[0].agentStatus).toBe("awaiting_answer");
    expect(repo.items[0].agentCurrentQuestion).toBe("Qual é o prazo esperado?");
  });

  it("atualiza status para completed e salva arquivo Drive", async () => {
    repo.items.push(makeProposal());

    await sut.execute({
      jobId: "job-1",
      status: "completed",
      driveFileId: "file-123",
      driveUrl: "https://drive.google.com/file/123",
      fileName: "proposta.pdf",
      fileSize: 102400,
    });

    const saved = repo.items[0];
    expect(saved.agentStatus).toBe("completed");
    expect(saved.agentCurrentQuestion).toBeUndefined();
    expect(saved.driveFileId).toBe("file-123");
    expect(saved.driveUrl).toBe("https://drive.google.com/file/123");
    expect(saved.fileName).toBe("proposta.pdf");
  });

  it("atualiza status para error", async () => {
    repo.items.push(makeProposal());

    await sut.execute({ jobId: "job-1", status: "error", errorMessage: "timeout" });

    expect(repo.items[0].agentStatus).toBe("error");
    expect(repo.items[0].agentCurrentQuestion).toBeUndefined();
  });

  it("faz upload via fileBase64 e salva driveFileId retornado pelo Drive", async () => {
    repo.items.push(makeProposal());
    const fakeBase64 = Buffer.from("%PDF-1.4 fake").toString("base64");

    await sut.execute({ jobId: "job-1", status: "completed", fileBase64: fakeBase64, fileName: "proposta.pdf" });

    expect(fakeDrive.uploadFile).toHaveBeenCalled();
    const saved = repo.items[0];
    expect(saved.agentStatus).toBe("completed");
    expect(saved.driveFileId).toBe("fake-drive-id");
    expect(saved.driveUrl).toContain("fake");
    expect(saved.fileName).toBe("proposta.pdf");
  });

  it("localiza proposta pelo proposalId quando fornecido", async () => {
    repo.items.push(makeProposal("prop-99", "job-99"));

    await sut.execute({ jobId: "job-99", proposalId: "prop-99", status: "completed" });

    expect(repo.items[0].agentStatus).toBe("completed");
  });
});
