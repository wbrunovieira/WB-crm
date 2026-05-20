import { describe, it, expect, beforeEach } from "vitest";
import { TriggerProposalAgentUseCase } from "@/domain/integrations/proposal-agent/application/use-cases/trigger-proposal-agent.use-case";
import { InMemoryLeadsRepository } from "../../../../leads/repositories/in-memory-leads.repository";
import { InMemoryProposalsRepository } from "../../fakes/in-memory-proposals.repository";
import { FakeProposalAgentPort } from "../../fakes/fake-proposal-agent.port";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { ConfigService } from "@nestjs/config";

function makeLead(id = "lead-1") {
  return Lead.create({ ownerId: "user-1", businessName: "Empresa Teste", city: "SP", website: "https://empresa.com" }, new UniqueEntityID(id));
}

function makeConfig(): ConfigService {
  return { get: (key: string) => key === "BASE_URL" ? "http://localhost:3010" : undefined } as unknown as ConfigService;
}

describe("TriggerProposalAgentUseCase", () => {
  let leadsRepo: InMemoryLeadsRepository;
  let proposalsRepo: InMemoryProposalsRepository;
  let agentPort: FakeProposalAgentPort;
  let sut: TriggerProposalAgentUseCase;

  beforeEach(() => {
    leadsRepo = new InMemoryLeadsRepository();
    proposalsRepo = new InMemoryProposalsRepository();
    agentPort = new FakeProposalAgentPort();
    sut = new TriggerProposalAgentUseCase(leadsRepo, proposalsRepo, agentPort);
  });

  it("retorna erro se lead não encontrado", async () => {
    const result = await sut.execute({
      leadId: "not-found",
      requesterId: "user-1",
      requesterRole: "admin",
      brand: "wb",
      contacts: [{ name: "João Silva", gender: "male" }],
    });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
  });

  it("cria proposta e aciona o agente com sucesso", async () => {
    leadsRepo.items.push(makeLead());

    const result = await sut.execute({
      leadId: "lead-1",
      requesterId: "user-1",
      requesterRole: "admin",
      brand: "wb",
      contacts: [{ name: "João Silva", gender: "male" }],
      instructions: "Foco em automação",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.jobId).toBe("fake-job-id");
    }
    expect(agentPort.triggerCalls).toHaveLength(1);
    expect(agentPort.triggerCalls[0].brand).toBe("wb");
    expect(agentPort.triggerCalls[0].instructions).toBe("Foco em automação");
    expect(proposalsRepo.items).toHaveLength(1);
    expect(proposalsRepo.items[0].agentJobId).toBe("fake-job-id");
    expect(proposalsRepo.items[0].agentStatus).toBe("processing");
  });

  it("marca proposta como error se agente falhar", async () => {
    leadsRepo.items.push(makeLead());
    agentPort.shouldThrow = true;

    const result = await sut.execute({
      leadId: "lead-1",
      requesterId: "user-1",
      requesterRole: "admin",
      brand: "salto",
      contacts: [],
    });

    expect(result.isLeft()).toBe(true);
    expect(proposalsRepo.items[0].agentStatus).toBe("error");
  });

  it("envia webhook URL corretamente", async () => {
    leadsRepo.items.push(makeLead());
    await sut.execute({
      leadId: "lead-1",
      requesterId: "user-1",
      requesterRole: "admin",
      brand: "wb",
      contacts: [],
    });
    expect(agentPort.triggerCalls[0].webhookUrl).toBe("https://crm.wbdigitalsolutions.com/webhooks/proposal-agent");
  });
});
