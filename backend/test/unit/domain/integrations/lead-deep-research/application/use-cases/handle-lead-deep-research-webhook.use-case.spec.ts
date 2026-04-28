import { describe, it, expect, beforeEach } from "vitest";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { InMemoryLeadContactsRepository } from "@test/unit/domain/leads/fakes/in-memory-lead-contacts.repository";
import { FakeLeadAgentResearchLogRepository } from "../../fakes/fake-lead-agent-research-log.repository";
import { HandleLeadDeepResearchWebhookUseCase } from "@/domain/integrations/lead-deep-research/application/use-cases/handle-lead-deep-research-webhook.use-case";

const makeLead = (ownerId = "user-1", extra: Partial<Parameters<typeof Lead.create>[0]> = {}) =>
  Lead.create({ ownerId, businessName: "Empresa Teste", ...extra });

describe("HandleLeadDeepResearchWebhookUseCase", () => {
  let leadsRepo: InMemoryLeadsRepository;
  let contactsRepo: InMemoryLeadContactsRepository;
  let logRepo: FakeLeadAgentResearchLogRepository;
  let sut: HandleLeadDeepResearchWebhookUseCase;

  beforeEach(() => {
    leadsRepo = new InMemoryLeadsRepository();
    contactsRepo = new InMemoryLeadContactsRepository();
    logRepo = new FakeLeadAgentResearchLogRepository();
    sut = new HandleLeadDeepResearchWebhookUseCase(leadsRepo, contactsRepo, logRepo);
  });

  it("fills empty fields and records updated fields", async () => {
    const lead = makeLead("user-1", { email: undefined, website: undefined });
    await leadsRepo.save(lead);

    const result = await sut.execute({
      jobId: "job-001",
      leadId: lead.id.toString(),
      status: "completed",
      updates: { email: "novo@empresa.com", website: "https://empresa.com" },
      summary: "Empresa encontrada com presença digital ativa.",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.updatedFields).toContain("email");
      expect(result.value.updatedFields).toContain("website");
    }

    const updated = leadsRepo.items[0];
    expect(updated.email).toBe("novo@empresa.com");
    expect(updated.website).toBe("https://empresa.com");
    expect(updated.agentSummary).toBe("Empresa encontrada com presença digital ativa.");
    expect(updated.agentResearchAt).toBeInstanceOf(Date);
  });

  it("does NOT overwrite fields that already have a value", async () => {
    const lead = makeLead("user-1", { email: "ja-tinha@empresa.com" });
    await leadsRepo.save(lead);

    const result = await sut.execute({
      jobId: "job-002",
      leadId: lead.id.toString(),
      status: "completed",
      updates: { email: "novo@empresa.com", website: "https://nova.com" },
      summary: "Pesquisa concluída.",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.updatedFields).not.toContain("email");
      expect(result.value.updatedFields).toContain("website");
    }

    const updated = leadsRepo.items[0];
    expect(updated.email).toBe("ja-tinha@empresa.com"); // preserved
    expect(updated.website).toBe("https://nova.com");   // filled
  });

  it("logs proposed fields that were skipped", async () => {
    const lead = makeLead("user-1", { instagram: "@existente" });
    await leadsRepo.save(lead);

    await sut.execute({
      jobId: "job-003",
      leadId: lead.id.toString(),
      status: "completed",
      updates: { instagram: "@outro_encontrado", email: "achei@empresa.com" },
      summary: "Sumário.",
    });

    const logs = await logRepo.findByLead(lead.id.toString());
    expect(logs).toHaveLength(1);
    const proposed = JSON.parse(logs[0].proposedFields ?? "[]");
    expect(proposed[0].field).toBe("instagram");
    expect(proposed[0].foundValue).toBe("@outro_encontrado");
  });

  it("creates new contacts found by agent", async () => {
    const lead = makeLead();
    await leadsRepo.save(lead);

    const result = await sut.execute({
      jobId: "job-004",
      leadId: lead.id.toString(),
      status: "completed",
      newContacts: [
        { name: "Maria Silva", email: "maria@empresa.com", role: "CEO" },
        { name: "Carlos Lima", phone: "+5511999999999", role: "CTO" },
      ],
      summary: "Dois contatos encontrados.",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.newContactsCount).toBe(2);
    expect(contactsRepo.items).toHaveLength(2);
  });

  it("persists audit log with all details", async () => {
    const lead = makeLead();
    await leadsRepo.save(lead);

    await sut.execute({
      jobId: "job-005",
      leadId: lead.id.toString(),
      status: "completed",
      updates: { website: "https://site.com" },
      summary: "Sumário completo.",
    });

    const logs = await logRepo.findByLead(lead.id.toString());
    expect(logs).toHaveLength(1);
    expect(logs[0].jobId).toBe("job-005");
    expect(logs[0].status).toBe("completed");
    const updated = JSON.parse(logs[0].updatedFields ?? "[]");
    expect(updated).toContain("website");
  });

  it("returns error when lead not found", async () => {
    const result = await sut.execute({
      jobId: "job-006",
      leadId: "nonexistent",
      status: "completed",
    });
    expect(result.isLeft()).toBe(true);
  });

  it("saves error status log on error webhook", async () => {
    const lead = makeLead();
    await leadsRepo.save(lead);

    await sut.execute({
      jobId: "job-007",
      leadId: lead.id.toString(),
      status: "error",
      error: "Agent timeout",
    });

    const logs = await logRepo.findByLead(lead.id.toString());
    expect(logs[0].status).toBe("error");
    expect(logs[0].error).toBe("Agent timeout");
  });
});
