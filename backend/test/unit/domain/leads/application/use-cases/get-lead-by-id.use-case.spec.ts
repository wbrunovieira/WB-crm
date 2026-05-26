import { describe, it, expect, beforeEach } from "vitest";
import { GetLeadByIdUseCase } from "@/domain/leads/application/use-cases/get-lead-by-id.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

function makeLead(ownerId = "user-1", businessName = "Empresa Teste", overrides: Partial<Parameters<typeof Lead.create>[0]> = {}) {
  return Lead.create({ ownerId, businessName, ...overrides });
}

// ─── GetLeadByIdUseCase ───────────────────────────────────────────────────────

describe("GetLeadByIdUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: GetLeadByIdUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new GetLeadByIdUseCase(repo);
  });

  it("retorna lead existente", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.lead.id).toBe(lead.id.toString());
  });

  it("retorna erro para lead inexistente", async () => {
    const result = await sut.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("não encontrado");
  });

  it("retorna erro ao acessar lead de outro usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
  });

  it("admin acessa lead de qualquer usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "admin-1", requesterRole: "admin" });

    expect(result.isRight()).toBe(true);
  });
});

// ─── Hierarquia matriz / filial ───────────────────────────────────────────────

describe("GetLeadByIdUseCase — hierarquia matriz/filial", () => {
  let repo: InMemoryLeadsRepository;
  let sut: GetLeadByIdUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new GetLeadByIdUseCase(repo);
  });

  it("retorna parentLead preenchido quando lead é filial", async () => {
    const matriz = makeLead("user-1", "Empresa Matriz");
    const filial = makeLead("user-1", "Filial Sul", { parentLeadId: matriz.id.toString() });
    await repo.save(matriz);
    await repo.save(filial);

    const result = await sut.execute({ id: filial.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.parentLead).not.toBeNull();
      expect(result.value.lead.parentLead?.id).toBe(matriz.id.toString());
      expect(result.value.lead.parentLead?.businessName).toBe("Empresa Matriz");
    }
  });

  it("retorna parentLead nulo para lead sem matriz", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.lead.parentLead).toBeNull();
  });

  it("retorna childLeads preenchido quando lead é matriz", async () => {
    const matriz = makeLead("user-1", "Empresa Matriz");
    const filial1 = makeLead("user-1", "Filial Norte", { parentLeadId: matriz.id.toString() });
    const filial2 = makeLead("user-1", "Filial Sul", { parentLeadId: matriz.id.toString() });
    await repo.save(matriz);
    await repo.save(filial1);
    await repo.save(filial2);

    const result = await sut.execute({ id: matriz.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.childLeads).toHaveLength(2);
      const names = result.value.lead.childLeads.map((c) => c.businessName);
      expect(names).toContain("Filial Norte");
      expect(names).toContain("Filial Sul");
    }
  });

  it("inclui filiais arquivadas em childLeads", async () => {
    const matriz = makeLead("user-1", "Empresa Matriz");
    const filialAtiva = makeLead("user-1", "Filial Ativa", { parentLeadId: matriz.id.toString() });
    const filialArquivada = makeLead("user-1", "Filial Arquivada", { parentLeadId: matriz.id.toString() });
    filialArquivada.archive("Filial da matriz, CNPJ encerrado");
    await repo.save(matriz);
    await repo.save(filialAtiva);
    await repo.save(filialArquivada);

    const result = await sut.execute({ id: matriz.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.childLeads).toHaveLength(2);
      const arquivada = result.value.lead.childLeads.find((c) => c.businessName === "Filial Arquivada");
      expect(arquivada).toBeDefined();
      expect(arquivada?.isArchived).toBe(true);
    }
  });

  it("filial arquivada expõe flag isArchived=true em childLeads", async () => {
    const matriz = makeLead("user-1", "Matriz");
    const filial = makeLead("user-1", "Filial", { parentLeadId: matriz.id.toString() });
    filial.archive("Encerrada");
    await repo.save(matriz);
    await repo.save(filial);

    const result = await sut.execute({ id: matriz.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.childLeads[0].isArchived).toBe(true);
    }
  });

  it("filial ativa expõe flag isArchived=false em childLeads", async () => {
    const matriz = makeLead("user-1", "Matriz");
    const filial = makeLead("user-1", "Filial Ativa", { parentLeadId: matriz.id.toString() });
    await repo.save(matriz);
    await repo.save(filial);

    const result = await sut.execute({ id: matriz.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.lead.childLeads[0].isArchived).toBe(false);
    }
  });

  it("childLeads vazio para lead sem filiais", async () => {
    const lead = makeLead();
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.lead.childLeads).toHaveLength(0);
  });
});
