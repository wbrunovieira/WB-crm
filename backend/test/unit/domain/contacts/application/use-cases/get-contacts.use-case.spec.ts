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

    const result = await sut.execute({ requesterId: "user-1", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);
    expect((result as any).value.contacts).toHaveLength(1);
  });

  it("admin vê todos os contatos", async () => {
    await repo.save(makeContact({ ownerId: "user-1" }));
    await repo.save(makeContact({ ownerId: "user-2" }));

    const result = await sut.execute({ requesterId: "admin-1", requesterRole: "admin" });
    expect((result as any).value.contacts).toHaveLength(2);
  });

  it("filtra por search (nome)", async () => {
    await repo.save(makeContact({ name: "João Silva", ownerId: "user-1" }));
    await repo.save(makeContact({ name: "Maria Lima", ownerId: "user-1" }));

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { search: "joão" },
    });
    expect((result as any).value.contacts).toHaveLength(1);
  });

  it("filtra por status", async () => {
    await repo.save(makeContact({ status: "active", ownerId: "user-1" }));
    await repo.save(makeContact({ status: "inactive", ownerId: "user-1" }));

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { status: "inactive" },
    });
    expect((result as any).value.contacts).toHaveLength(1);
  });
});
