import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryContactsRepository } from "@test/unit/domain/contacts/repositories/in-memory-contacts.repository";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { EmailVerifierPort, type EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { BatchVerifyContactEmailsUseCase } from "@/domain/integrations/phone/application/use-cases/batch-verify-contact-emails.use-case";

class FakeEmailVerifier extends EmailVerifierPort {
  public resultToReturn: EmailVerificationResult = { valid: true, status: "valid", reason: "Email válido" };

  async verify(_email: string): Promise<EmailVerificationResult> {
    return this.resultToReturn;
  }
}

function makeContact(id: string, overrides: Partial<{ email: string; ownerId: string }> = {}) {
  return Contact.create({
    ownerId: overrides.ownerId ?? "owner-1",
    name: `Contato ${id}`,
    email: overrides.email,
  }, new UniqueEntityID(id));
}

describe("BatchVerifyContactEmailsUseCase", () => {
  let contactsRepo: InMemoryContactsRepository;
  let emailVerifier: FakeEmailVerifier;
  let sut: BatchVerifyContactEmailsUseCase;

  beforeEach(() => {
    contactsRepo = new InMemoryContactsRepository();
    emailVerifier = new FakeEmailVerifier();
    sut = new BatchVerifyContactEmailsUseCase(emailVerifier, contactsRepo);
  });

  it("returns left when no contacts found for ownerId", async () => {
    const result = await sut.execute({ ownerId: "nonexistent" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Nenhum contato encontrado");
  });

  it("counts skipped contacts without email", async () => {
    const c1 = makeContact("c-1"); // no email
    const c2 = makeContact("c-2", { email: "test@example.com" });
    contactsRepo.items.push(c1, c2);

    const result = await sut.execute({ ownerId: "owner-1", delayMs: 0 });
    expect(result.isRight()).toBe(true);

    const value = result.value as { total: number; checked: number; skipped: number };
    expect(value.total).toBe(2);
    expect(value.skipped).toBe(1);
    expect(value.checked).toBe(1);
  });

  it("counts valid and invalid correctly", async () => {
    const c1 = makeContact("c-1", { email: "valid@example.com" });
    const c2 = makeContact("c-2", { email: "invalid@fake.xyz" });
    contactsRepo.items.push(c1, c2);

    let callNum = 0;
    emailVerifier.verify = async (_email) => {
      callNum++;
      return callNum === 1
        ? { valid: true, status: "valid" as const, reason: "ok" }
        : { valid: false, status: "invalid" as const, reason: "Sem MX" };
    };

    const result = await sut.execute({ ownerId: "owner-1", delayMs: 0 });
    expect(result.isRight()).toBe(true);

    const value = result.value as { valid: number; invalid: number; checked: number };
    expect(value.valid).toBe(1);
    expect(value.invalid).toBe(1);
    expect(value.checked).toBe(2);
  });

  it("saves verified results to contacts repo", async () => {
    const c1 = makeContact("c-1", { email: "test@example.com" });
    contactsRepo.items.push(c1);

    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };

    await sut.execute({ ownerId: "owner-1", delayMs: 0 });

    const updated = contactsRepo.items[0];
    expect(updated.emailVerified).toBe(true);
    expect(updated.emailVerificationStatus).toBe("valid");
  });

  it("fires onProgress for each contact", async () => {
    const c1 = makeContact("c-1", { email: "test@example.com" });
    const c2 = makeContact("c-2"); // skipped
    contactsRepo.items.push(c1, c2);

    const events: unknown[] = [];
    await sut.execute({ ownerId: "owner-1", delayMs: 0, onProgress: (p) => events.push(p) });

    expect(events).toHaveLength(2);
  });
});
