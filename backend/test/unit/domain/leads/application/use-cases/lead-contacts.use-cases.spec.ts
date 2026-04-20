import { describe, it, expect, beforeEach } from "vitest";
import {
  GetLeadContactsUseCase,
  CreateLeadContactUseCase,
  UpdateLeadContactUseCase,
  DeleteLeadContactUseCase,
  ToggleLeadContactActiveUseCase,
} from "@/domain/leads/application/use-cases/lead-contacts.use-cases";
import { InMemoryLeadContactsRepository } from "../../fakes/in-memory-lead-contacts.repository";

const LEAD_ID = "lead-1";

// ─── GetLeadContactsUseCase ───────────────────────────────────────────────────

describe("GetLeadContactsUseCase", () => {
  let repo: InMemoryLeadContactsRepository;
  let sut: GetLeadContactsUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadContactsRepository();
    sut = new GetLeadContactsUseCase(repo);
  });

  it("retorna lista vazia quando não há contatos", async () => {
    const result = await sut.execute({ leadId: LEAD_ID });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value).toHaveLength(0);
  });

  it("retorna contatos do lead", async () => {
    await repo.create({ leadId: LEAD_ID, name: "João" });
    await repo.create({ leadId: LEAD_ID, name: "Maria" });
    await repo.create({ leadId: "other-lead", name: "Outro" });

    const result = await sut.execute({ leadId: LEAD_ID });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value).toHaveLength(2);
  });
});

// ─── CreateLeadContactUseCase ─────────────────────────────────────────────────

describe("CreateLeadContactUseCase", () => {
  let repo: InMemoryLeadContactsRepository;
  let sut: CreateLeadContactUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadContactsRepository();
    sut = new CreateLeadContactUseCase(repo);
  });

  it("cria contato com campos opcionais", async () => {
    const result = await sut.execute({
      leadId: LEAD_ID,
      name: "Ana Silva",
      role: "CEO",
      email: "ana@empresa.com",
      phone: "11999990000",
      isPrimary: true,
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe("Ana Silva");
      expect(result.value.role).toBe("CEO");
      expect(result.value.isPrimary).toBe(true);
      expect(result.value.isActive).toBe(true);
      expect(result.value.leadId).toBe(LEAD_ID);
    }
  });

  it("rejeita nome vazio", async () => {
    const result = await sut.execute({ leadId: LEAD_ID, name: "   " });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("vazio");
  });

  it("trim no nome", async () => {
    const result = await sut.execute({ leadId: LEAD_ID, name: "  Carlos  " });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.name).toBe("Carlos");
  });
});

// ─── UpdateLeadContactUseCase ─────────────────────────────────────────────────

describe("UpdateLeadContactUseCase", () => {
  let repo: InMemoryLeadContactsRepository;
  let sut: UpdateLeadContactUseCase;

  beforeEach(async () => {
    repo = new InMemoryLeadContactsRepository();
    sut = new UpdateLeadContactUseCase(repo);
    await repo.create({ leadId: LEAD_ID, name: "Inicial" });
  });

  it("atualiza campos do contato", async () => {
    const contact = repo.items[0];
    const result = await sut.execute({ id: contact.id, name: "Atualizado", role: "CTO" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.name).toBe("Atualizado");
      expect(result.value.role).toBe("CTO");
    }
  });

  it("retorna NotFoundError para contato inexistente", async () => {
    const result = await sut.execute({ id: "id-inexistente" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.name).toBe("LeadContactNotFoundError");
  });

  it("rejeita nome vazio na atualização", async () => {
    const contact = repo.items[0];
    const result = await sut.execute({ id: contact.id, name: "  " });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("vazio");
  });
});

// ─── DeleteLeadContactUseCase ─────────────────────────────────────────────────

describe("DeleteLeadContactUseCase", () => {
  let repo: InMemoryLeadContactsRepository;
  let sut: DeleteLeadContactUseCase;

  beforeEach(async () => {
    repo = new InMemoryLeadContactsRepository();
    sut = new DeleteLeadContactUseCase(repo);
    await repo.create({ leadId: LEAD_ID, name: "Para Deletar" });
  });

  it("deleta contato existente", async () => {
    const contact = repo.items[0];
    const result = await sut.execute({ id: contact.id });

    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("retorna NotFoundError para contato inexistente", async () => {
    const result = await sut.execute({ id: "nao-existe" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.name).toBe("LeadContactNotFoundError");
  });
});

// ─── ToggleLeadContactActiveUseCase ──────────────────────────────────────────

describe("ToggleLeadContactActiveUseCase", () => {
  let repo: InMemoryLeadContactsRepository;
  let sut: ToggleLeadContactActiveUseCase;

  beforeEach(async () => {
    repo = new InMemoryLeadContactsRepository();
    sut = new ToggleLeadContactActiveUseCase(repo);
    await repo.create({ leadId: LEAD_ID, name: "Toggle Test" });
  });

  it("desativa contato ativo", async () => {
    const contact = repo.items[0];
    expect(contact.isActive).toBe(true);

    const result = await sut.execute({ id: contact.id });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.isActive).toBe(false);
  });

  it("ativa contato inativo", async () => {
    const contact = repo.items[0];
    await repo.toggleActive(contact.id); // manually deactivate

    const result = await sut.execute({ id: contact.id });
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.isActive).toBe(true);
  });

  it("retorna NotFoundError para contato inexistente", async () => {
    const result = await sut.execute({ id: "nao-existe" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.name).toBe("LeadContactNotFoundError");
  });
});
