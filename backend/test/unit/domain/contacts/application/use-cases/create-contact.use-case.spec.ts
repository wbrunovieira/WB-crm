import { describe, it, expect, beforeEach } from "vitest";
import { CreateContactUseCase } from "@/domain/contacts/application/use-cases/create-contact.use-case";
import { InMemoryContactsRepository } from "../../repositories/in-memory-contacts.repository";

describe("CreateContactUseCase", () => {
  let repo: InMemoryContactsRepository;
  let sut: CreateContactUseCase;

  beforeEach(() => {
    repo = new InMemoryContactsRepository();
    sut = new CreateContactUseCase(repo);
  });

  it("cria contato com dados válidos", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      name: "João Silva",
      email: "joao@email.com",
    });

    expect(result.isRight()).toBe(true);
    const { contact } = (result as any).value;
    expect(contact.name).toBe("João Silva");
    expect(contact.email).toBe("joao@email.com");
    expect(contact.status).toBe("active");
    expect(repo.items).toHaveLength(1);
  });

  it("retorna erro para nome vazio", async () => {
    const result = await sut.execute({ ownerId: "user-1", name: "  " });
    expect(result.isLeft()).toBe(true);
    expect((result as any).value.message).toContain("obrigatório");
  });

  it("associa corretamente ao leadId quando companyType=lead", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      name: "Contato Lead",
      companyType: "lead",
      companyId: "lead-123",
    });
    expect((result as any).value.contact.leadId).toBe("lead-123");
    expect((result as any).value.contact.organizationId).toBeUndefined();
  });

  it("associa ao organizationId quando companyType=organization", async () => {
    const result = await sut.execute({
      ownerId: "user-1",
      name: "Contato Org",
      companyType: "organization",
      companyId: "org-456",
    });
    expect((result as any).value.contact.organizationId).toBe("org-456");
  });
});
