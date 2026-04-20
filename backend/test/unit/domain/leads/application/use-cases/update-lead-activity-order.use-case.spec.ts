import { describe, it, expect, beforeEach } from "vitest";
import { UpdateLeadActivityOrderUseCase, ResetLeadActivityOrderUseCase } from "@/domain/leads/application/use-cases/update-lead-activity-order.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

const makeLead = (ownerId = "user-1") => Lead.create({ ownerId, businessName: "Empresa Teste" });

// ─── UpdateLeadActivityOrderUseCase ──────────────────────────────────────────

describe("UpdateLeadActivityOrderUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: UpdateLeadActivityOrderUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new UpdateLeadActivityOrderUseCase(repo);
  });

  it("salva activityOrder como JSON string", async () => {
    const lead = makeLead();
    await repo.save(lead);
    const ids = ["act-3", "act-1", "act-2"];

    const result = await sut.execute({
      leadId: lead.id.toString(),
      activityIds: ids,
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    const saved = repo.items.find(l => l.id.equals(lead.id))!;
    expect(saved.activityOrder).toBe(JSON.stringify(ids));
  });

  it("retorna erro quando activityIds está vazio", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({
      leadId: lead.id.toString(),
      activityIds: [],
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toMatch(/vazia/i);
  });

  it("retorna erro quando lead não existe", async () => {
    const result = await sut.execute({
      leadId: "inexistente",
      activityIds: ["act-1"],
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
  });

  it("bloqueia SDR tentando alterar lead de outro usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      leadId: lead.id.toString(),
      activityIds: ["act-1"],
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toMatch(/autorizado/i);
  });

  it("admin pode alterar lead de qualquer usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      leadId: lead.id.toString(),
      activityIds: ["act-1"],
      requesterId: "admin-1",
      requesterRole: "admin",
    });

    expect(result.isRight()).toBe(true);
  });
});

// ─── ResetLeadActivityOrderUseCase ───────────────────────────────────────────

describe("ResetLeadActivityOrderUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: ResetLeadActivityOrderUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new ResetLeadActivityOrderUseCase(repo);
  });

  it("limpa activityOrder do lead", async () => {
    const lead = makeLead();
    lead.update({ activityOrder: JSON.stringify(["act-1", "act-2"]) });
    await repo.save(lead);

    const result = await sut.execute({
      leadId: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    const saved = repo.items.find(l => l.id.equals(lead.id))!;
    expect(saved.activityOrder).toBeUndefined();
  });

  it("retorna erro quando lead não existe", async () => {
    const result = await sut.execute({
      leadId: "inexistente",
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
  });

  it("bloqueia SDR tentando resetar lead de outro usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      leadId: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
  });
});
