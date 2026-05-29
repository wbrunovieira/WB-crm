import { describe, it, expect, beforeEach } from "vitest";
import { EmailVerifierPort, type EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { VerifyLeadContactEmailUseCase } from "@/domain/integrations/email/application/use-cases/verify-lead-contact-email.use-case";
import { InMemoryLeadContactsRepository } from "@test/unit/domain/leads/fakes/in-memory-lead-contacts.repository";
import { InvalidEmailVerificationError } from "@/domain/integrations/email/enterprise/value-objects/email-verification.vo";

// ── Fakes ────────────────────────────────────────────────────────────────────

class FakeEmailVerifier extends EmailVerifierPort {
  public lastVerifiedEmail: string | null = null;
  public callCount = 0;
  public resultToReturn: EmailVerificationResult = { valid: true, status: "valid", reason: "Email válido" };
  public error: Error | null = null;

  async verify(email: string): Promise<EmailVerificationResult> {
    this.callCount++;
    this.lastVerifiedEmail = email;
    if (this.error) throw this.error;
    return this.resultToReturn;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function seedContact(repo: InMemoryLeadContactsRepository, email: string | null): Promise<string> {
  const c = await repo.create({ leadId: "lead-1", name: "Contato", email: email ?? undefined });
  // create() coerces undefined → null, which matches a "no email" contact
  return c.id;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VerifyLeadContactEmailUseCase", () => {
  let emailVerifier: FakeEmailVerifier;
  let leadContacts: InMemoryLeadContactsRepository;
  let sut: VerifyLeadContactEmailUseCase;

  beforeEach(() => {
    emailVerifier = new FakeEmailVerifier();
    leadContacts = new InMemoryLeadContactsRepository();
    sut = new VerifyLeadContactEmailUseCase(emailVerifier, leadContacts);
  });

  it("returns left when leadContact not found", async () => {
    const result = await sut.execute({ leadContactId: "nonexistent", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não encontrado");
  });

  it("does not call the verifier when the contact is not found", async () => {
    await sut.execute({ leadContactId: "nope", requesterId: "owner-1" });
    expect(emailVerifier.callCount).toBe(0);
  });

  it("returns left when leadContact has no email", async () => {
    const id = await seedContact(leadContacts, null);
    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não possui email");
    expect(emailVerifier.callCount).toBe(0);
  });

  it("calls verifier with leadContact email", async () => {
    const id = await seedContact(leadContacts, "contato@empresa.com");
    await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(emailVerifier.lastVerifiedEmail).toBe("contato@empresa.com");
  });

  it("persists emailVerified=true when valid", async () => {
    const id = await seedContact(leadContacts, "valid@empresa.com");
    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };

    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const saved = leadContacts.verifications[id];
    expect(saved.valid).toBe(true);
    expect(saved.status).toBe("valid");
    expect(saved.reason).toBe("Email válido");
    expect(saved.verifiedAt).toBeInstanceOf(Date);
  });

  it("persists emailVerified=false when invalid", async () => {
    const id = await seedContact(leadContacts, "bad@fake.xyz");
    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "Sem MX" };

    await sut.execute({ leadContactId: id, requesterId: "owner-1" });

    const saved = leadContacts.verifications[id];
    expect(saved.valid).toBe(false);
    expect(saved.status).toBe("invalid");
    expect(saved.reason).toBe("Sem MX");
  });

  it.each(["valid", "invalid", "risky", "unknown"] as const)("persists known status %s", async (status) => {
    const id = await seedContact(leadContacts, "c@e.com");
    emailVerifier.resultToReturn = { valid: status === "valid", status, reason: `r-${status}` };

    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);
    expect(leadContacts.verifications[id].status).toBe(status);
  });

  it("returns right with leadContactId, email, valid, status, reason", async () => {
    const id = await seedContact(leadContacts, "test@example.com");
    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { leadContactId: string; email: string; valid: boolean; status: string; reason: string };
    expect(value.leadContactId).toBe(id);
    expect(value.email).toBe("test@example.com");
    expect(value.valid).toBe(true);
    expect(value.status).toBe("valid");
    expect(value.reason).toBe("Email válido");
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it("falls back to a status-derived reason when the verifier returns an empty reason", async () => {
    const id = await seedContact(leadContacts, "c@e.com");
    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "   " };

    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const saved = leadContacts.verifications[id];
    expect(saved.reason.trim().length).toBeGreaterThan(0);
    // result mirrors what was persisted
    expect((result.value as { reason: string }).reason).toBe(saved.reason);
  });

  it("returns left and persists nothing when the verifier yields an unknown status (VO guard)", async () => {
    const id = await seedContact(leadContacts, "c@e.com");
    emailVerifier.resultToReturn = { valid: false, status: "garbage" as never, reason: "x" };

    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidEmailVerificationError);
    expect(leadContacts.verifications[id]).toBeUndefined();
  });

  it("propagates a verifier failure as left without persisting", async () => {
    const id = await seedContact(leadContacts, "c@e.com");
    emailVerifier.error = new Error("verifier offline");

    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("verifier offline");
    expect(leadContacts.verifications[id]).toBeUndefined();
  });

  it("verifies exactly once per call (no duplicate verifier hits)", async () => {
    const id = await seedContact(leadContacts, "c@e.com");
    await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(emailVerifier.callCount).toBe(1);
  });

  it("returns left (does not throw) when the repository save fails", async () => {
    const id = await seedContact(leadContacts, "c@e.com");
    leadContacts.saveEmailVerification = async () => {
      throw new Error("db down");
    };

    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("db down");
  });

  it("overwrites the previous verdict on re-verification (idempotent last-write-wins)", async () => {
    const id = await seedContact(leadContacts, "c@e.com");

    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "ok" };
    await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(leadContacts.verifications[id].status).toBe("valid");

    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "now bad" };
    await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(leadContacts.verifications[id].status).toBe("invalid");
    expect(leadContacts.verifications[id].valid).toBe(false);
  });

  it("persists valid and status verbatim even when they look inconsistent (valid is decoupled from status)", async () => {
    const id = await seedContact(leadContacts, "c@e.com");
    emailVerifier.resultToReturn = { valid: true, status: "invalid", reason: "inconsistent upstream" };

    const result = await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const saved = leadContacts.verifications[id];
    expect(saved.valid).toBe(true);
    expect(saved.status).toBe("invalid");
  });

  it("verifies the raw stored email (normalization is not this layer's responsibility)", async () => {
    const id = await seedContact(leadContacts, "  MiXeD@Empresa.COM  ");
    await sut.execute({ leadContactId: id, requesterId: "owner-1" });
    expect(emailVerifier.lastVerifiedEmail).toBe("  MiXeD@Empresa.COM  ");
  });
});
