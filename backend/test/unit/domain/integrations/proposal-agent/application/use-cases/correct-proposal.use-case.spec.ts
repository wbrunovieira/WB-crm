import { describe, it, expect, beforeEach } from "vitest";
import { CorrectProposalUseCase } from "@/domain/integrations/proposal-agent/application/use-cases/correct-proposal.use-case";
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

function makeProposal(overrides: Partial<{ leadId: string; driveUrl: string; agentStatus: string; ownerId: string }> = {}) {
  const r = Proposal.create({
    title: "Proposta Teste",
    leadId: overrides.leadId ?? "lead-1",
    ownerId: overrides.ownerId ?? "user-1",
    status: "draft",
    driveUrl: overrides.driveUrl ?? "https://drive.google.com/file/d/abc123/view",
    agentStatus: overrides.agentStatus ?? "completed",
    agentTriggeredAt: new Date(),
  });
  if (r.isLeft()) throw r.value;
  return r.value;
}

describe("CorrectProposalUseCase", () => {
  let proposalsRepo: InMemoryProposalsRepository;
  let leadsRepo: InMemoryLeadsRepository;
  let agentPort: FakeProposalAgentPort;
  let sut: CorrectProposalUseCase;

  beforeEach(() => {
    proposalsRepo = new InMemoryProposalsRepository();
    leadsRepo = new InMemoryLeadsRepository();
    agentPort = new FakeProposalAgentPort();
    sut = new CorrectProposalUseCase(proposalsRepo, leadsRepo, agentPort);
  });

  it("retorna erro se proposta não encontrada", async () => {
    const result = await sut.execute({
      proposalId: "not-found",
      requesterId: "user-1",
      requesterRole: "admin",
      instructions: "Corrija o preço para R$ 1.000",
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
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
      instructions: "Corrija algo",
    });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Drive");
  });

  it("aciona agente de correção com sucesso e atualiza status", async () => {
    const proposal = makeProposal();
    proposalsRepo.items.push(proposal);
    leadsRepo.items.push(makeLead());

    const result = await sut.execute({
      proposalId: proposal.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      instructions: "Reduza o prazo para 5 dias",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.jobId).toBe("fake-job-id");
      expect(result.value.proposalId).toBe(proposal.id.toString());
    }
    expect(agentPort.correctCalls).toHaveLength(1);
    expect(agentPort.correctCalls[0].instructions).toBe("Reduza o prazo para 5 dias");
    expect(agentPort.correctCalls[0].driveUrl).toBe("https://drive.google.com/file/d/abc123/view");

    const saved = proposalsRepo.items[0];
    expect(saved.agentStatus).toBe("processing");
    expect(saved.agentJobId).toBe("fake-job-id");
  });

  it("envia webhookUrl com URL de produção", async () => {
    const proposal = makeProposal();
    proposalsRepo.items.push(proposal);
    leadsRepo.items.push(makeLead());

    await sut.execute({
      proposalId: proposal.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      instructions: "ajuste",
    });

    expect(agentPort.correctCalls[0].webhookUrl).toBe("https://crm.wbdigitalsolutions.com/webhooks/proposal-agent");
  });

  it("marca proposta como error se agente falhar", async () => {
    const proposal = makeProposal();
    proposalsRepo.items.push(proposal);
    leadsRepo.items.push(makeLead());
    agentPort.shouldThrow = true;

    const result = await sut.execute({
      proposalId: proposal.id.toString(),
      requesterId: "user-1",
      requesterRole: "admin",
      instructions: "algo",
    });

    expect(result.isLeft()).toBe(true);
    expect(proposalsRepo.items[0].agentStatus).toBe("error");
  });
});
