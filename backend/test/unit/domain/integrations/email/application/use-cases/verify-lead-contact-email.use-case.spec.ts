import { describe, it, expect, beforeEach } from "vitest";
import { EmailVerifierPort, type EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { VerifyLeadContactEmailUseCase } from "@/domain/integrations/email/application/use-cases/verify-lead-contact-email.use-case";
import { InMemoryLeadContactsRepository } from "@test/unit/domain/leads/fakes/in-memory-lead-contacts.repository";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { InvalidEmailVerificationError } from "@/domain/integrations/email/enterprise/value-objects/email-verification.vo";

const OWNER = "owner-1";
const LEAD_ID = "lead-1";

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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VerifyLeadContactEmailUseCase", () => {
  let emailVerifier: FakeEmailVerifier;
  let leadContacts: InMemoryLeadContactsRepository;
  let leads: InMemoryLeadsRepository;
  let sut: VerifyLeadContactEmailUseCase;

  async function seedContact(email: string | null, leadId = LEAD_ID): Promise<string> {
    const c = await leadContacts.create({ leadId, name: "Contato", email: email ?? undefined });
    return c.id;
  }

  function run(leadContactId: string, requesterId = OWNER, requesterRole = "sdr") {
    return sut.execute({ leadContactId, requesterId, requesterRole });
  }

  beforeEach(() => {
    emailVerifier = new FakeEmailVerifier();
    leadContacts = new InMemoryLeadContactsRepository();
    leads = new InMemoryLeadsRepository();
    // The parent lead, owned by OWNER
    leads.items.push(Lead.create({ businessName: "Empresa", ownerId: OWNER }, new UniqueEntityID(LEAD_ID)));
    sut = new VerifyLeadContactEmailUseCase(emailVerifier, leadContacts, leads);
  });

  it("returns left when leadContact not found", async () => {
    const result = await run("nonexistent");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não encontrado");
    expect(emailVerifier.callCount).toBe(0);
  });

  it("returns left when leadContact has no email", async () => {
    const id = await seedContact(null);
    const result = await run(id);
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não possui email");
    expect(emailVerifier.callCount).toBe(0);
  });

  it("calls verifier with leadContact email", async () => {
    const id = await seedContact("contato@empresa.com");
    await run(id);
    expect(emailVerifier.lastVerifiedEmail).toBe("contato@empresa.com");
  });

  it("persists emailVerified=true when valid", async () => {
    const id = await seedContact("valid@empresa.com");
    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };

    const result = await run(id);
    expect(result.isRight()).toBe(true);

    const saved = leadContacts.verifications[id];
    expect(saved.valid).toBe(true);
    expect(saved.status).toBe("valid");
    expect(saved.reason).toBe("Email válido");
    expect(saved.verifiedAt).toBeInstanceOf(Date);
  });

  it("persists emailVerified=false when invalid", async () => {
    const id = await seedContact("bad@fake.xyz");
    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "Sem MX" };

    await run(id);

    const saved = leadContacts.verifications[id];
    expect(saved.valid).toBe(false);
    expect(saved.status).toBe("invalid");
    expect(saved.reason).toBe("Sem MX");
  });

  it.each(["valid", "invalid", "risky", "unknown"] as const)("persists known status %s", async (status) => {
    const id = await seedContact("c@e.com");
    emailVerifier.resultToReturn = { valid: status === "valid", status, reason: `r-${status}` };

    const result = await run(id);
    expect(result.isRight()).toBe(true);
    expect(leadContacts.verifications[id].status).toBe(status);
  });

  it("returns right with leadContactId, email, valid, status, reason", async () => {
    const id = await seedContact("test@example.com");
    const result = await run(id);
    expect(result.isRight()).toBe(true);

    const value = result.value as { leadContactId: string; email: string; valid: boolean; status: string; reason: string };
    expect(value.leadContactId).toBe(id);
    expect(value.email).toBe("test@example.com");
    expect(value.valid).toBe(true);
    expect(value.status).toBe("valid");
    expect(value.reason).toBe("Email válido");
  });

  // ── Authorization / data isolation ────────────────────────────────────────────

  it("denies access when the requester does not own the parent lead", async () => {
    const id = await seedContact("c@e.com");
    const result = await run(id, "another-user", "sdr");

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Não autorizado");
    expect(emailVerifier.callCount).toBe(0);
    expect(leadContacts.verifications[id]).toBeUndefined();
  });

  it("allows an admin to verify a contact they do not own", async () => {
    const id = await seedContact("c@e.com");
    const result = await run(id, "another-user", "admin");
    expect(result.isRight()).toBe(true);
  });

  it("returns left when the parent lead no longer exists", async () => {
    const id = await seedContact("c@e.com", "ghost-lead");
    const result = await run(id);
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Lead não encontrado");
    expect(emailVerifier.callCount).toBe(0);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it("falls back to a status-derived reason when the verifier returns an empty reason", async () => {
    const id = await seedContact("c@e.com");
    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "   " };

    const result = await run(id);
    expect(result.isRight()).toBe(true);

    const saved = leadContacts.verifications[id];
    expect(saved.reason.trim().length).toBeGreaterThan(0);
    expect((result.value as { reason: string }).reason).toBe(saved.reason);
  });

  it("returns left and persists nothing when the verifier yields an unknown status (VO guard)", async () => {
    const id = await seedContact("c@e.com");
    emailVerifier.resultToReturn = { valid: false, status: "garbage" as never, reason: "x" };

    const result = await run(id);

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidEmailVerificationError);
    expect(leadContacts.verifications[id]).toBeUndefined();
  });

  it("propagates a verifier failure as left without persisting", async () => {
    const id = await seedContact("c@e.com");
    emailVerifier.error = new Error("verifier offline");

    const result = await run(id);

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("verifier offline");
    expect(leadContacts.verifications[id]).toBeUndefined();
  });

  it("returns left (does not throw) when the repository save fails", async () => {
    const id = await seedContact("c@e.com");
    leadContacts.saveEmailVerification = async () => {
      throw new Error("db down");
    };

    const result = await run(id);

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("db down");
  });

  it("overwrites the previous verdict on re-verification (idempotent last-write-wins)", async () => {
    const id = await seedContact("c@e.com");

    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "ok" };
    await run(id);
    expect(leadContacts.verifications[id].status).toBe("valid");

    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "now bad" };
    await run(id);
    expect(leadContacts.verifications[id].status).toBe("invalid");
    expect(leadContacts.verifications[id].valid).toBe(false);
  });

  it("persists valid and status verbatim even when they look inconsistent (valid is decoupled from status)", async () => {
    const id = await seedContact("c@e.com");
    emailVerifier.resultToReturn = { valid: true, status: "invalid", reason: "inconsistent upstream" };

    const result = await run(id);
    expect(result.isRight()).toBe(true);

    const saved = leadContacts.verifications[id];
    expect(saved.valid).toBe(true);
    expect(saved.status).toBe("invalid");
  });

  it("verifies the raw stored email (normalization is not this layer's responsibility)", async () => {
    const id = await seedContact("  MiXeD@Empresa.COM  ");
    await run(id);
    expect(emailVerifier.lastVerifiedEmail).toBe("  MiXeD@Empresa.COM  ");
  });

  it("verifies exactly once per call (no duplicate verifier hits)", async () => {
    const id = await seedContact("c@e.com");
    await run(id);
    expect(emailVerifier.callCount).toBe(1);
  });
});
