import { describe, it, expect, beforeEach } from "vitest";
import { ReviseProposalUseCase } from "@/domain/integrations/proposal-agent/application/use-cases/revise-proposal.use-case";
import { InMemoryProposalsRepository } from "../../fakes/in-memory-proposals.repository";
import { FakeProposalAgentPort } from "../../fakes/fake-proposal-agent.port";
import { InMemoryLeadsRepository } from "../../../../leads/repositories/in-memory-leads.repository";
import { Proposal } from "@/domain/proposals/enterprise/entities/proposal";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

function makeLead(id = "lead-1") {
  return Lead.create(
    { ownerId: "user-1", businessName: "Empresa Teste", city: "SP", website: "https://empresa.com" },
    new UniqueEntityID(id),
  );
}

function makeProposal(overrides: Partial<{ revisionNumber: number; originalProposalId: string }> = {}) {
  const r = Proposal.create({
    title: "Proposta Original",
    leadId: "lead-1",
    ownerId: "user-1",
    status: "draft",
    driveUrl: "https://drive.google.com/file/d/abc123/view",
    agentStatus: "completed",
    agentTriggeredAt: new Date(),
    revisionNumber: overrides.revisionNumber,
    originalProposalId: overrides.originalProposalId,
  });
  if (r.isLeft()) throw r.value;
  return r.value;
}

describe("ReviseProposalUseCase", () => {
  let proposalsRepo: InMemoryProposalsRepository;
  let leadsRepo: InMemoryLeadsRepository;
  let agentPort: FakeProposalAgentPort;
  let sut: ReviseProposalUseCase;

  beforeEach(() => {
    proposalsRepo = new InMemoryProposalsRepository();
    leadsRepo = new InMemoryLeadsRepository();
    agentPort = new FakeProposalAgentPort();
    sut = new ReviseProposalUseCase(proposalsRepo, leadsRepo, agentPort);
  });

  it("retorna erro se proposta original não encontrada", async () => {
    const result = await sut.execute({
      proposalId: "not-found",
      requesterId: "user-1",
      requesterRole: "admin",
      revisionNotes: "Reduza 10% do preço",
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Proposta não encontrada");
  });

  it("retorna erro se proposta não tem driveUrl", async () => {
    const proposal = Proposal.create({
      title: "Proposta sem arquivo",
      leadId: "lead-1",
      ownerId: "user-1",
      status: "draft",
      agentStatus: "completed",
      agentTriggeredAt: new Date(),
    }).unwrap() as Proposal;
    proposalsRepo.items.push(proposal);
    leadsRepo.items.push(makeLead());

    const result = await sut.execute({
      proposalId: proposal.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      revisionNotes: "ajuste",
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Drive");
  });

  it("cria nova proposta de revisão com revisionNumber=1 para proposta original", async () => {
    const original = makeProposal();
    proposalsRepo.items.push(original);
    leadsRepo.items.push(makeLead());

    const result = await sut.execute({
      proposalId: original.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      revisionNotes: "Ajuste de prazo e pagamento",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.jobId).toBe("fake-job-id");
      expect(result.value.revisionNumber).toBe(1);
    }

    // deve ter criado nova proposta de revisão
    expect(proposalsRepo.items).toHaveLength(2);
    const revision = proposalsRepo.items[1];
    expect(revision.revisionNumber).toBe(1);
    expect(revision.originalProposalId).toBe(original.id.toString());
    expect(revision.agentStatus).toBe("processing");
    expect(revision.agentJobId).toBe("fake-job-id");
    expect(revision.title).toContain("REV1");
  });

  it("incrementa revisionNumber quando proposta já é uma revisão", async () => {
    const original = makeProposal();
    const rev1 = makeProposal({ revisionNumber: 1, originalProposalId: original.id.toString() });
    proposalsRepo.items.push(original, rev1);
    leadsRepo.items.push(makeLead());

    const result = await sut.execute({
      proposalId: rev1.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      revisionNotes: "Mais ajustes",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.revisionNumber).toBe(2);
    }
    const rev2 = proposalsRepo.items[2];
    expect(rev2.revisionNumber).toBe(2);
    expect(rev2.title).toContain("REV2");
  });

  it("aciona agente de revisão com payload correto", async () => {
    const original = makeProposal();
    proposalsRepo.items.push(original);
    leadsRepo.items.push(makeLead());

    await sut.execute({
      proposalId: original.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      revisionNotes: "Reduzir valor em 15%",
    });

    expect(agentPort.reviseCalls).toHaveLength(1);
    expect(agentPort.reviseCalls[0].revisionNotes).toBe("Reduzir valor em 15%");
    expect(agentPort.reviseCalls[0].revisionNumber).toBe(1);
    expect(agentPort.reviseCalls[0].driveUrl).toBe("https://drive.google.com/file/d/abc123/view");
    expect(agentPort.reviseCalls[0].webhookUrl).toBe("https://crm.wbdigitalsolutions.com/webhooks/proposal-agent");
  });

  it("marca nova proposta como error se agente falhar", async () => {
    const original = makeProposal();
    proposalsRepo.items.push(original);
    leadsRepo.items.push(makeLead());
    agentPort.shouldThrow = true;

    const result = await sut.execute({
      proposalId: original.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      revisionNotes: "algo",
    });

    expect(result.isLeft()).toBe(true);
    // a nova proposta de revisão deve existir mas com status error
    expect(proposalsRepo.items).toHaveLength(2);
    expect(proposalsRepo.items[1].agentStatus).toBe("error");
  });
});
