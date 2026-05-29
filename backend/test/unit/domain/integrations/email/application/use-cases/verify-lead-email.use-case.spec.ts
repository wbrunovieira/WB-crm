import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { EmailVerifierPort, EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { VerifyLeadEmailUseCase } from "@/domain/integrations/email/application/use-cases/verify-lead-email.use-case";
import { InvalidEmailVerificationError } from "@/domain/integrations/email/enterprise/value-objects/email-verification.vo";

class FakeEmailVerifier extends EmailVerifierPort {
  public lastVerifiedEmail: string | null = null;
  public callCount = 0;
  public error: Error | null = null;
  public resultToReturn: EmailVerificationResult = {
    valid: true,
    status: "valid",
    reason: "Email válido",
  };

  async verify(email: string): Promise<EmailVerificationResult> {
    this.callCount++;
    this.lastVerifiedEmail = email;
    if (this.error) throw this.error;
    return this.resultToReturn;
  }
}

function makeLead(overrides: Partial<{ email: string; sourceGroup: string }> = {}) {
  return Lead.create({
    ownerId: "owner-1",
    businessName: "Empresa Teste",
    email: overrides.email,
    sourceGroup: overrides.sourceGroup,
  }, new UniqueEntityID("lead-1"));
}

describe("VerifyLeadEmailUseCase", () => {
  let leadsRepo: InMemoryLeadsRepository;
  let emailVerifier: FakeEmailVerifier;
  let sut: VerifyLeadEmailUseCase;

  beforeEach(() => {
    leadsRepo = new InMemoryLeadsRepository();
    emailVerifier = new FakeEmailVerifier();
    sut = new VerifyLeadEmailUseCase(emailVerifier, leadsRepo);
  });

  it("returns left 'Lead não encontrado' when lead does not exist", async () => {
    const result = await sut.execute({ leadId: "nonexistent", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(Error);
    expect((result.value as Error).message).toBe("Lead não encontrado");
  });

  it("returns left 'Lead não possui email' when lead has no email", async () => {
    const lead = makeLead(); // no email
    leadsRepo.items.push(lead);

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Lead não possui email");
  });

  it("calls verifier with lead email", async () => {
    const lead = makeLead({ email: "contato@empresa.com" });
    leadsRepo.items.push(lead);

    await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });

    expect(emailVerifier.lastVerifiedEmail).toBe("contato@empresa.com");
  });

  it("on valid result: saves emailVerified=true and correct fields to lead", async () => {
    const lead = makeLead({ email: "valid@empresa.com" });
    leadsRepo.items.push(lead);

    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);

    const updated = leadsRepo.items[0];
    expect(updated.emailVerified).toBe(true);
    expect(updated.emailVerifiedAt).toBeInstanceOf(Date);
    expect(updated.emailVerificationStatus).toBe("valid");
    expect(updated.emailVerificationReason).toBe("Email válido");
  });

  it("on invalid result: saves emailVerified=false and correct fields", async () => {
    const lead = makeLead({ email: "invalid@fake-domain.xyz" });
    leadsRepo.items.push(lead);

    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "Domínio não possui servidor de email (sem MX)" };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);

    const updated = leadsRepo.items[0];
    expect(updated.emailVerified).toBe(false);
    expect(updated.emailVerificationStatus).toBe("invalid");
    expect(updated.emailVerificationReason).toBe("Domínio não possui servidor de email (sem MX)");
  });

  it("returns right with { leadId, email, valid, status, reason }", async () => {
    const lead = makeLead({ email: "test@example.com" });
    leadsRepo.items.push(lead);

    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);

    const value = result.value as { leadId: string; email: string; valid: boolean; status: string; reason: string };
    expect(value.leadId).toBe("lead-1");
    expect(value.email).toBe("test@example.com");
    expect(value.valid).toBe(true);
    expect(value.status).toBe("valid");
    expect(value.reason).toBe("Email válido");
  });

  // ── Authorization / data isolation ────────────────────────────────────────────

  it("denies access when the requester does not own the lead", async () => {
    leadsRepo.items.push(makeLead({ email: "c@e.com" })); // owned by owner-1

    const result = await sut.execute({ leadId: "lead-1", requesterId: "another-user", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("Não autorizado");
    expect(emailVerifier.callCount).toBe(0);
    expect(leadsRepo.items[0].emailVerificationStatus).toBeUndefined();
  });

  it("allows an admin to verify a lead they do not own", async () => {
    leadsRepo.items.push(makeLead({ email: "c@e.com" }));
    const result = await sut.execute({ leadId: "lead-1", requesterId: "another-user", requesterRole: "admin" });
    expect(result.isRight()).toBe(true);
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  it("returns left and persists nothing when the verifier yields an unknown status (VO guard)", async () => {
    leadsRepo.items.push(makeLead({ email: "c@e.com" }));
    emailVerifier.resultToReturn = { valid: false, status: "garbage" as never, reason: "x" };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    expect(result.value).toBeInstanceOf(InvalidEmailVerificationError);
    expect(leadsRepo.items[0].emailVerificationStatus).toBeUndefined();
  });

  it("falls back to a status-derived reason when the verifier returns an empty reason", async () => {
    leadsRepo.items.push(makeLead({ email: "c@e.com" }));
    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "   " };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(result.isRight()).toBe(true);
    expect((leadsRepo.items[0].emailVerificationReason ?? "").trim().length).toBeGreaterThan(0);
  });

  it("propagates a verifier failure as left without persisting", async () => {
    leadsRepo.items.push(makeLead({ email: "c@e.com" }));
    emailVerifier.error = new Error("verifier offline");

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("verifier offline");
    expect(leadsRepo.items[0].emailVerificationStatus).toBeUndefined();
  });

  it("returns left (does not throw) when the repository save fails", async () => {
    leadsRepo.items.push(makeLead({ email: "c@e.com" }));
    leadsRepo.saveEmailVerification = async () => {
      throw new Error("db down");
    };

    const result = await sut.execute({ leadId: "lead-1", requesterId: "owner-1", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("db down");
  });
});
