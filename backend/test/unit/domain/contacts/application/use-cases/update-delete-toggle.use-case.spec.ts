import { describe, it, expect, beforeEach } from "vitest";
import { UpdateContactUseCase } from "@/domain/contacts/application/use-cases/update-contact.use-case";
import { DeleteContactUseCase } from "@/domain/contacts/application/use-cases/delete-contact.use-case";
import { ToggleContactStatusUseCase } from "@/domain/contacts/application/use-cases/toggle-contact-status.use-case";
import { InMemoryContactsRepository } from "../../repositories/in-memory-contacts.repository";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";

const makeContact = (ownerId = "user-1") =>
  Contact.create({ ownerId, name: "João Silva" });

describe("UpdateContactUseCase", () => {
  let repo: InMemoryContactsRepository;
  let sut: UpdateContactUseCase;

  beforeEach(() => {
    repo = new InMemoryContactsRepository();
    sut = new UpdateContactUseCase(repo);
  });

  it("atualiza contato do próprio owner", async () => {
    const c = makeContact();
    await repo.save(c);

    const { contact } = (await sut.execute({
      id: c.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      name: "Novo Nome",
      email: "novo@email.com",
    })).unwrap();

    expect(contact.name).toBe("Novo Nome");
  });

  it("não permite atualizar contato de outro owner", async () => {
    const c = makeContact("user-2");
    await repo.save(c);

    const result = await sut.execute({
      id: c.id.toString(),
      requesterId: "user-1",
      requesterRole: "sdr",
      name: "Invasão",
    });
    expect(result.isLeft()).toBe(true);
  });

  it("admin pode atualizar qualquer contato", async () => {
    const c = makeContact("user-2");
    await repo.save(c);

    const result = await sut.execute({
      id: c.id.toString(),
      requesterId: "admin-1",
      requesterRole: "admin",
      name: "Atualizado pelo admin",
    });
    expect(result.isRight()).toBe(true);
  });
});

describe("DeleteContactUseCase", () => {
  let repo: InMemoryContactsRepository;
  let sut: DeleteContactUseCase;

  beforeEach(() => {
    repo = new InMemoryContactsRepository();
    sut = new DeleteContactUseCase(repo);
  });

  it("deleta contato do próprio owner", async () => {
    const c = makeContact();
    await repo.save(c);

    const result = await sut.execute({ id: c.id.toString(), requesterId: "user-1", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("retorna erro para contato inexistente", async () => {
    const result = await sut.execute({ id: "fake", requesterId: "user-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
  });
});

describe("ToggleContactStatusUseCase", () => {
  let repo: InMemoryContactsRepository;
  let sut: ToggleContactStatusUseCase;

  beforeEach(() => {
    repo = new InMemoryContactsRepository();
    sut = new ToggleContactStatusUseCase(repo);
  });

  it("alterna status de active para inactive", async () => {
    const c = makeContact();
    await repo.save(c);

    const { contact } = (await sut.execute({ id: c.id.toString(), requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(contact.status).toBe("inactive");
  });

  it("alterna status de inactive para active", async () => {
    const c = Contact.create({ ownerId: "user-1", name: "João", status: "inactive" });
    await repo.save(c);

    const { contact } = (await sut.execute({ id: c.id.toString(), requesterId: "user-1", requesterRole: "sdr" })).unwrap();
    expect(contact.status).toBe("active");
  });
});
