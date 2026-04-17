import { describe, it, expect, beforeEach } from "vitest";
import { GetContactsUseCase } from "@/domain/contacts/application/use-cases/get-contacts.use-case";
import { InMemoryContactsRepository } from "../../repositories/in-memory-contacts.repository";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";

const makeContact = (overrides: Partial<Parameters<typeof Contact.create>[0]> = {}) =>
  Contact.create({ ownerId: "user-1", name: "João", ...overrides });

describe("GetContactsUseCase", () => {
  let repo: InMemoryContactsRepository;
  let sut: GetContactsUseCase;

  beforeEach(() => {
    repo = new InMemoryContactsRepository();
    sut = new GetContactsUseCase(repo);
  });

  it("retorna apenas contatos do owner para não-admin", async () => {
    await repo.save(makeContact({ ownerId: "user-1" }));
    await repo.save(makeContact({ ownerId: "user-2" }));

    const { contacts } = await (await sut.execute({ requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(contacts).toHaveLength(1);
  });

  it("admin vê todos os contatos", async () => {
    await repo.save(makeContact({ ownerId: "user-1" }));
    await repo.save(makeContact({ ownerId: "user-2" }));

    const { contacts } = (await sut.execute({ requesterId: "admin-1", requesterRole: "admin" })).unwrap();
    expect(contacts).toHaveLength(2);
  });

  it("filtra por search (nome)", async () => {
    await repo.save(makeContact({ name: "João Silva", ownerId: "user-1" }));
    await repo.save(makeContact({ name: "Maria Lima", ownerId: "user-1" }));

    const { contacts } = (await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { search: "joão" },
    })).unwrap();
    expect(contacts).toHaveLength(1);
  });

  it("filtra por status", async () => {
    await repo.save(makeContact({ status: "active", ownerId: "user-1" }));
    await repo.save(makeContact({ status: "inactive", ownerId: "user-1" }));

    const { contacts } = (await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { status: "inactive" },
    })).unwrap();
    expect(contacts).toHaveLength(1);
  });

  it("retorna organization quando contato tem organização vinculada", async () => {
    const contact = makeContact({ ownerId: "user-1", organizationId: "org-1" });
    await repo.save(contact);
    repo.organizationsMap.set("org-1", { id: "org-1", name: "Empresa Teste" });

    const { contacts } = (await sut.execute({ requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(contacts[0].organization).toEqual({ id: "org-1", name: "Empresa Teste" });
  });

  it("retorna lead quando contato tem lead vinculado", async () => {
    const contact = makeContact({ ownerId: "user-1", leadId: "lead-1" });
    await repo.save(contact);
    repo.leadsMap.set("lead-1", { id: "lead-1", businessName: "Lead Corp" });

    const { contacts } = (await sut.execute({ requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(contacts[0].lead).toEqual({ id: "lead-1", businessName: "Lead Corp" });
  });

  it("retorna owner quando contato tem owner mapeado", async () => {
    const contact = makeContact({ ownerId: "user-1" });
    await repo.save(contact);
    repo.ownersMap.set("user-1", { id: "user-1", name: "Usuário Um", email: "user1@test.com" });

    const { contacts } = (await sut.execute({ requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(contacts[0].owner).toMatchObject({ id: "user-1", name: "Usuário Um" });
  });
});
