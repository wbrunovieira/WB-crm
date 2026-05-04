import { describe, it, expect, beforeEach } from "vitest";
import { UpdateLeadUseCase } from "@/domain/leads/application/use-cases/update-lead.use-case";
import { ArchiveLeadUseCase } from "@/domain/leads/application/use-cases/archive-lead.use-case";
import { UnarchiveLeadUseCase } from "@/domain/leads/application/use-cases/unarchive-lead.use-case";
import { DeleteLeadUseCase } from "@/domain/leads/application/use-cases/delete-lead.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

const makeLead = (ownerId = "user-1", businessName = "Empresa Teste") =>
  Lead.create({ ownerId, businessName });

// ─── UpdateLeadUseCase ────────────────────────────────────────────────────────

describe("UpdateLeadUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: UpdateLeadUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new UpdateLeadUseCase(repo);
  });

  it("atualiza campos do lead", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      businessName: "Empresa Atualizada",
      city: "Rio de Janeiro",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.businessName).toBe("Empresa Atualizada");
      expect(result.value.lead.city).toBe("Rio de Janeiro");
    }
  });

  it("retorna NotFoundError para lead inexistente", async () => {
    const result = await sut.execute({
      id: "id-inexistente",
      requesterId: "user-1",
      requesterRole: "sdr",
      businessName: "Qualquer coisa",
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("não encontrado");
    }
  });

  it("retorna ForbiddenError para outro usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      businessName: "Invasão",
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("autorizado");
    }
  });

  it("admin pode atualizar lead de qualquer owner", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "admin-1",
      requesterRole: "admin",
      businessName: "Atualizado pelo Admin",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.businessName).toBe("Atualizado pelo Admin");
    }
  });

  it("atualiza campo notes do lead", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      notes: "Está abrindo nova loja no bairro",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.lead.notes).toBe("Está abrindo nova loja no bairro");
  });

  it("limpa campo notes com null", async () => {
    const lead = makeLead();
    await repo.save(lead);

    await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr", notes: "nota inicial" });
    const result = await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr", notes: null });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.lead.notes).toBeNull();
  });

  it("atualiza parentLeadId para vincular matriz", async () => {
    const parent = makeLead("user-1", "Empresa Matriz");
    const child = makeLead("user-1", "Filial 1");
    await repo.save(parent);
    await repo.save(child);

    const result = await sut.execute({
      id: child.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      parentLeadId: parent.id.toString(),
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.lead.parentLeadId).toBe(parent.id.toString());
  });

  it("limpa parentLeadId com null", async () => {
    const parent = makeLead("user-1", "Matriz");
    const child = makeLead("user-1", "Filial");
    await repo.save(parent);
    await repo.save(child);

    await sut.execute({ id: child.id.toString(), requesterId: "user-1", requesterRole: "sdr", parentLeadId: parent.id.toString() });
    const result = await sut.execute({ id: child.id.toString(), requesterId: "user-1", requesterRole: "sdr", parentLeadId: null });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.lead.parentLeadId).toBeNull();
  });
});

// ─── ArchiveLeadUseCase ───────────────────────────────────────────────────────

describe("ArchiveLeadUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: ArchiveLeadUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new ArchiveLeadUseCase(repo);
  });

  it("arquiva lead com motivo", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      reason: "Sem interesse",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.isArchived).toBe(true);
      expect(result.value.lead.archivedReason).toBe("Sem interesse");
      expect(result.value.lead.archivedAt).toBeDefined();
    }
  });

  it("arquiva lead sem motivo", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.isArchived).toBe(true);
      expect(result.value.lead.archivedReason).toBeUndefined();
    }
  });

  it("retorna NotFoundError para lead inexistente", async () => {
    const result = await sut.execute({
      id: "id-inexistente",
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("não encontrado");
    }
  });

  it("retorna erro para outro usuário tentando arquivar", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
  });
});

// ─── UnarchiveLeadUseCase ─────────────────────────────────────────────────────

describe("UnarchiveLeadUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: UnarchiveLeadUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new UnarchiveLeadUseCase(repo);
  });

  it("desarquiva lead", async () => {
    const lead = makeLead();
    lead.archive("Motivo qualquer");
    await repo.save(lead);

    expect(lead.isArchived).toBe(true);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.isArchived).toBe(false);
      expect(result.value.lead.archivedAt).toBeUndefined();
      expect(result.value.lead.archivedReason).toBeUndefined();
    }
  });

  it("retorna NotFoundError para lead inexistente", async () => {
    const result = await sut.execute({
      id: "id-inexistente",
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("não encontrado");
    }
  });

  it("retorna erro para outro usuário tentando desarquivar", async () => {
    const lead = makeLead("user-2");
    lead.archive();
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
  });
});

// ─── DeleteLeadUseCase ────────────────────────────────────────────────────────

describe("DeleteLeadUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: DeleteLeadUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new DeleteLeadUseCase(repo);
  });

  it("deleta lead", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("retorna NotFoundError para lead inexistente", async () => {
    const result = await sut.execute({
      id: "id-inexistente",
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) {
      expect(result.value.message).toContain("não encontrado");
    }
  });

  it("retorna erro ao tentar deletar lead de outro usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isLeft()).toBe(true);
    expect(repo.items).toHaveLength(1);
  });

  it("admin pode deletar lead de qualquer owner", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({
      id: lead.id.toString(),
      requesterId: "admin-1",
      requesterRole: "admin",
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });
});
