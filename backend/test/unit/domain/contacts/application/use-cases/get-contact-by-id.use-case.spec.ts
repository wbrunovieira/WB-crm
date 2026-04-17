import { describe, it, expect, beforeEach } from "vitest";
import { GetContactByIdUseCase } from "@/domain/contacts/application/use-cases/get-contact-by-id.use-case";
import { InMemoryContactsRepository } from "../../repositories/in-memory-contacts.repository";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";

const makeContact = (overrides: Partial<Parameters<typeof Contact.create>[0]> = {}) =>
  Contact.create({ ownerId: "user-1", name: "João", ...overrides });

const NOW = new Date("2025-01-01T10:00:00Z");

describe("GetContactByIdUseCase", () => {
  let repo: InMemoryContactsRepository;
  let sut: GetContactByIdUseCase;

  beforeEach(() => {
    repo = new InMemoryContactsRepository();
    sut = new GetContactByIdUseCase(repo);
  });

  it("retorna erro quando contato não encontrado", async () => {
    const result = await sut.execute({ id: "id-inexistente", requesterId: "user-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain("não encontrado");
  });

  it("retorna contato com deals e activities para owner", async () => {
    const contact = makeContact({ ownerId: "user-1" });
    const contactId = contact.id.toString();
    await repo.save(contact);

    repo.dealsMap.set(contactId, [
      { id: "deal-1", title: "Negócio Teste", contactId, stage: { name: "Proposta" } },
    ]);
    repo.activitiesMap.set(contactId, [
      {
        id: "act-1",
        type: "call",
        subject: "Ligação inicial",
        description: null,
        dueDate: null,
        completed: false,
        completedAt: null,
        createdAt: NOW,
        contactId,
        leadId: null,
        dealId: null,
        partnerId: null,
        whatsappMessages: [],
      },
    ]);

    const { contact: detail } = (await sut.execute({ id: contactId, requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(detail.deals).toHaveLength(1);
    expect(detail.deals[0].title).toBe("Negócio Teste");
    expect(detail.deals[0].stage.name).toBe("Proposta");
    expect(detail.activities).toHaveLength(1);
    expect(detail.activities[0].type).toBe("call");
    expect(detail.activities[0].subject).toBe("Ligação inicial");
    expect(detail.activities[0].completed).toBe(false);
  });

  it("retorna contato com owner preenchido", async () => {
    const contact = makeContact({ ownerId: "user-1" });
    await repo.save(contact);
    repo.ownersMap.set("user-1", { id: "user-1", name: "Usuário Um", email: "user1@test.com" });

    const { contact: detail } = (await sut.execute({ id: contact.id.toString(), requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(detail.owner).toEqual({ id: "user-1", name: "Usuário Um", email: "user1@test.com" });
  });

  it("admin consegue ver contato de outro usuário com relações", async () => {
    const contact = makeContact({ ownerId: "user-2" });
    await repo.save(contact);

    const { contact: detail } = (await sut.execute({ id: contact.id.toString(), requesterId: "admin-1", requesterRole: "admin" })).unwrap();
    expect(detail.id).toBe(contact.id.toString());
    expect(detail.deals).toEqual([]);
    expect(detail.activities).toEqual([]);
  });

  it("não-admin não consegue ver contato de outro usuário", async () => {
    const contact = makeContact({ ownerId: "user-2" });
    await repo.save(contact);

    const result = await sut.execute({ id: contact.id.toString(), requesterId: "user-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });

  it("retorna languages como string JSON bruta (não parsed)", async () => {
    const rawLangs = JSON.stringify([{ code: "pt-BR", isPrimary: true }]);
    const contact = makeContact({ ownerId: "user-1", languages: rawLangs });
    await repo.save(contact);

    const { contact: detail } = (await sut.execute({ id: contact.id.toString(), requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(typeof detail.languages).toBe("string");
    expect(detail.languages).toBe(rawLangs);
  });
});
