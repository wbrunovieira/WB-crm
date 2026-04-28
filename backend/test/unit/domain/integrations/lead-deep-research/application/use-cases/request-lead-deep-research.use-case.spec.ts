import { describe, it, expect, beforeEach } from "vitest";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { InMemoryLeadContactsRepository } from "@test/unit/domain/leads/fakes/in-memory-lead-contacts.repository";
import { FakeAgentDeepResearchPort } from "../../fakes/fake-agent-deep-research.port";
import { RequestLeadDeepResearchUseCase } from "@/domain/integrations/lead-deep-research/application/use-cases/request-lead-deep-research.use-case";

const makeLead = (ownerId = "user-1", extra: Partial<Parameters<typeof Lead.create>[0]> = {}) =>
  Lead.create({ ownerId, businessName: "Empresa Teste", ...extra });

describe("RequestLeadDeepResearchUseCase", () => {
  let leadsRepo: InMemoryLeadsRepository;
  let contactsRepo: InMemoryLeadContactsRepository;
  let agentPort: FakeAgentDeepResearchPort;
  let sut: RequestLeadDeepResearchUseCase;

  beforeEach(() => {
    leadsRepo = new InMemoryLeadsRepository();
    contactsRepo = new InMemoryLeadContactsRepository();
    agentPort = new FakeAgentDeepResearchPort();
    sut = new RequestLeadDeepResearchUseCase(leadsRepo, contactsRepo, agentPort);
  });

  it("returns jobId on success", async () => {
    const lead = makeLead("user-1", { email: "test@test.com", website: "https://test.com" });
    await leadsRepo.save(lead);

    const result = await sut.execute({ leadId: lead.id.toString(), requesterId: "user-1", requesterRole: "admin" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.jobId).toBe("job-001");
  });

  it("sends all lead fields and contacts to agent", async () => {
    const lead = makeLead("user-1", {
      email: "empresa@test.com",
      website: "https://empresa.com",
      instagram: "@empresa",
      city: "São Paulo",
    });
    await leadsRepo.save(lead);

    await contactsRepo.create({ leadId: lead.id.toString(), name: "João Silva", role: "CEO", email: "joao@test.com" });

    await sut.execute({ leadId: lead.id.toString(), requesterId: "user-1", requesterRole: "admin" });

    expect(agentPort.calls).toHaveLength(1);
    const call = agentPort.calls[0];
    expect(call.lead.businessName).toBe("Empresa Teste");
    expect(call.lead.email).toBe("empresa@test.com");
    expect(call.lead.instagram).toBe("@empresa");
    expect(call.contacts).toHaveLength(1);
    expect(call.contacts[0].name).toBe("João Silva");
  });

  it("returns error when lead not found", async () => {
    const result = await sut.execute({ leadId: "nonexistent", requesterId: "user-1", requesterRole: "admin" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("não encontrado");
  });

  it("propagates agent port error", async () => {
    const lead = makeLead();
    await leadsRepo.save(lead);
    agentPort.shouldThrow = true;

    await expect(
      sut.execute({ leadId: lead.id.toString(), requesterId: "user-1", requesterRole: "admin" })
    ).rejects.toThrow("Agent service unavailable");
  });
});
