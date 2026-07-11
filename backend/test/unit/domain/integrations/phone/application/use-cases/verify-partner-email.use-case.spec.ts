import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPartnersRepository } from "@test/unit/domain/partners/repositories/in-memory-partners.repository";
import { Partner } from "@/domain/partners/enterprise/entities/partner";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { EmailVerifierPort, type EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { VerifyPartnerEmailUseCase } from "@/domain/integrations/phone/application/use-cases/verify-partner-email.use-case";

class FakeEmailVerifier extends EmailVerifierPort {
  public lastVerifiedEmail: string | null = null;
  public resultToReturn: EmailVerificationResult = { valid: true, status: "valid", reason: "Email válido" };

  async verify(email: string): Promise<EmailVerificationResult> {
    this.lastVerifiedEmail = email;
    return this.resultToReturn;
  }
}

function makePartner(overrides: Partial<{ email: string; ownerId: string }> = {}) {
  return Partner.create({
    ownerId: overrides.ownerId ?? "owner-1",
    name: "Parceiro Teste",
    partnerType: "consultoria",
    partnerStatus: "active",
    email: overrides.email,
  }, new UniqueEntityID("partner-1"));
}

describe("VerifyPartnerEmailUseCase", () => {
  let partnersRepo: InMemoryPartnersRepository;
  let emailVerifier: FakeEmailVerifier;
  let sut: VerifyPartnerEmailUseCase;

  beforeEach(() => {
    partnersRepo = new InMemoryPartnersRepository();
    emailVerifier = new FakeEmailVerifier();
    sut = new VerifyPartnerEmailUseCase(emailVerifier, partnersRepo);
  });

  it("returns left when partner not found", async () => {
    const r = await sut.execute({ partnerId: "nope", requesterId: "owner-1", requesterRole: "sdr" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).message).toBe("Parceiro não encontrado");
  });

  it("returns left when partner has no email", async () => {
    partnersRepo.items.push(makePartner());
    const r = await sut.execute({ partnerId: "partner-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).message).toBe("Parceiro não possui email");
  });

  it("rejects a partner owned by another user (data isolation)", async () => {
    partnersRepo.items.push(makePartner({ email: "x@y.com", ownerId: "owner-2" }));
    const r = await sut.execute({ partnerId: "partner-1", requesterId: "owner-1", requesterRole: "sdr" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).message).toBe("Não autorizado");
    expect(partnersRepo.emailVerifications.has("partner-1")).toBe(false);
  });

  it("admin can verify another user's partner", async () => {
    partnersRepo.items.push(makePartner({ email: "x@y.com", ownerId: "owner-2" }));
    const r = await sut.execute({ partnerId: "partner-1", requesterId: "owner-1", requesterRole: "admin" });
    expect(r.isRight()).toBe(true);
  });

  it("verifies email and persists the result", async () => {
    partnersRepo.items.push(makePartner({ email: "contato@parceiro.com" }));
    emailVerifier.resultToReturn = { valid: false, status: "risky", reason: "Catch-all domain" };

    const r = await sut.execute({ partnerId: "partner-1", requesterId: "owner-1", requesterRole: "sdr" });

    expect(r.isRight()).toBe(true);
    expect(emailVerifier.lastVerifiedEmail).toBe("contato@parceiro.com");
    const saved = partnersRepo.emailVerifications.get("partner-1");
    expect(saved?.emailVerified).toBe(false);
    expect(saved?.emailVerificationStatus).toBe("risky");
    expect(saved?.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
