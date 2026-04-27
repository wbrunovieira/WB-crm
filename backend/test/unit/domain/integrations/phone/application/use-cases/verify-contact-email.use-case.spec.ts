import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryContactsRepository } from "@test/unit/domain/contacts/repositories/in-memory-contacts.repository";
import { Contact } from "@/domain/contacts/enterprise/entities/contact";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { EmailVerifierPort, type EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { VerifyContactEmailUseCase } from "@/domain/integrations/phone/application/use-cases/verify-contact-email.use-case";

class FakeEmailVerifier extends EmailVerifierPort {
  public lastVerifiedEmail: string | null = null;
  public resultToReturn: EmailVerificationResult = {
    valid: true,
    status: "valid",
    reason: "Email válido",
  };

  async verify(email: string): Promise<EmailVerificationResult> {
    this.lastVerifiedEmail = email;
    return this.resultToReturn;
  }
}

function makeContact(overrides: Partial<{ email: string }> = {}) {
  return Contact.create({
    ownerId: "owner-1",
    name: "Contato Teste",
    email: overrides.email,
  }, new UniqueEntityID("contact-1"));
}

describe("VerifyContactEmailUseCase", () => {
  let contactsRepo: InMemoryContactsRepository;
  let emailVerifier: FakeEmailVerifier;
  let sut: VerifyContactEmailUseCase;

  beforeEach(() => {
    contactsRepo = new InMemoryContactsRepository();
    emailVerifier = new FakeEmailVerifier();
    sut = new VerifyContactEmailUseCase(emailVerifier, contactsRepo);
  });

  it("returns left when contact not found", async () => {
    const result = await sut.execute({ contactId: "nonexistent", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Contato não encontrado");
  });

  it("returns left when contact has no email", async () => {
    const contact = makeContact(); // no email
    contactsRepo.items.push(contact);

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Contato não possui email");
  });

  it("calls verifier with contact email", async () => {
    const contact = makeContact({ email: "contato@empresa.com" });
    contactsRepo.items.push(contact);

    await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });

    expect(emailVerifier.lastVerifiedEmail).toBe("contato@empresa.com");
  });

  it("saves emailVerified=true when valid", async () => {
    const contact = makeContact({ email: "valid@empresa.com" });
    contactsRepo.items.push(contact);

    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const updated = contactsRepo.items[0];
    expect(updated.emailVerified).toBe(true);
    expect(updated.emailVerifiedAt).toBeInstanceOf(Date);
    expect(updated.emailVerificationStatus).toBe("valid");
    expect(updated.emailVerificationReason).toBe("Email válido");
  });

  it("saves emailVerified=false when invalid", async () => {
    const contact = makeContact({ email: "bad@fakeDomain.xyz" });
    contactsRepo.items.push(contact);

    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "Sem MX" };

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const updated = contactsRepo.items[0];
    expect(updated.emailVerified).toBe(false);
    expect(updated.emailVerificationStatus).toBe("invalid");
    expect(updated.emailVerificationReason).toBe("Sem MX");
  });

  it("returns right with contactId, email, valid, status, reason", async () => {
    const contact = makeContact({ email: "test@example.com" });
    contactsRepo.items.push(contact);

    const result = await sut.execute({ contactId: "contact-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { contactId: string; email: string; valid: boolean; status: string; reason: string };
    expect(value.contactId).toBe("contact-1");
    expect(value.email).toBe("test@example.com");
    expect(value.valid).toBe(true);
    expect(value.status).toBe("valid");
    expect(value.reason).toBe("Email válido");
  });
});
