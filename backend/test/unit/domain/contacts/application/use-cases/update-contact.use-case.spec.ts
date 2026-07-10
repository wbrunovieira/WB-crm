import { describe, it, expect, beforeEach } from "vitest";
import { UpdateContactUseCase } from "@/domain/contacts/application/use-cases/update-contact.use-case";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { InMemoryContactsRepository } from "../../repositories/in-memory-contacts.repository";

function makeContact(over: Partial<Parameters<typeof Contact.create>[0]> = {}) {
  return Contact.create({
    ownerId: "owner-1",
    name: "Ana Souza",
    email: "ana@x.com",
    phone: "+5521999990000",
    role: "CTO",
    department: "Tecnologia",
    notes: "Prefere contato à tarde",
    languages: '[{"code":"pt-BR","isPrimary":true}]',
    partnerId: "partner-1",
    ...over,
  });
}

describe("UpdateContactUseCase", () => {
  let repo: InMemoryContactsRepository;
  let sut: UpdateContactUseCase;

  beforeEach(() => {
    repo = new InMemoryContactsRepository();
    sut = new UpdateContactUseCase(repo);
  });

  it("updates only the fields sent, preserving the partner link and unsent fields (partial PATCH)", async () => {
    const contact = makeContact();
    repo.items.push(contact);

    // Simulates the partner contacts edit modal: it sends the managed fields and
    // companyType/companyId, but NOT department / notes / languages.
    const result = await sut.execute({
      id: contact.id.toString(),
      requesterId: "owner-1",
      requesterRole: "admin",
      name: "Ana Souza Silva",
      role: "CEO",
      companyType: "partner",
      companyId: "partner-1",
    });

    expect(result.isRight()).toBe(true);
    const updated = repo.items[0];
    // Sent fields changed
    expect(updated.name).toBe("Ana Souza Silva");
    expect(updated.role).toBe("CEO");
    // Partner link preserved (no detach)
    expect(updated.partnerId).toBe("partner-1");
    // Unsent fields preserved (no wipe)
    expect(updated.department).toBe("Tecnologia");
    expect(updated.notes).toBe("Prefere contato à tarde");
    expect(updated.languages).toBe('[{"code":"pt-BR","isPrimary":true}]');
    expect(updated.email).toBe("ana@x.com");
  });

  it("does not touch the company link when companyType is omitted", async () => {
    const contact = makeContact();
    repo.items.push(contact);

    const result = await sut.execute({
      id: contact.id.toString(),
      requesterId: "owner-1",
      requesterRole: "admin",
      name: "Novo Nome",
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items[0].partnerId).toBe("partner-1");
    expect(repo.items[0].leadId).toBeUndefined();
    expect(repo.items[0].organizationId).toBeUndefined();
  });

  it("reassigns the company link and clears the others when companyType changes", async () => {
    const contact = makeContact();
    repo.items.push(contact);

    const result = await sut.execute({
      id: contact.id.toString(),
      requesterId: "owner-1",
      requesterRole: "admin",
      companyType: "organization",
      companyId: "org-9",
    });

    expect(result.isRight()).toBe(true);
    expect(repo.items[0].organizationId).toBe("org-9");
    expect(repo.items[0].partnerId).toBeUndefined();
    expect(repo.items[0].leadId).toBeUndefined();
  });

  it("rejects updating a contact owned by another non-admin user", async () => {
    const contact = makeContact({ ownerId: "someone-else" });
    repo.items.push(contact);

    const result = await sut.execute({
      id: contact.id.toString(),
      requesterId: "owner-1",
      requesterRole: "sdr",
      name: "Hack",
    });

    expect(result.isLeft()).toBe(true);
  });
});
