import { describe, it, expect, beforeEach } from "vitest";
import { EmailVerifierPort, type EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { VerifyLeadContactEmailUseCase } from "@/domain/integrations/email/application/use-cases/verify-lead-contact-email.use-case";

// ── Fakes ────────────────────────────────────────────────────────────────────

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

interface LeadContactRecord {
  id: string;
  email: string | null;
  updatedData?: Record<string, unknown>;
}

function makeFakePrisma(items: LeadContactRecord[]) {
  return {
    leadContact: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const item = items.find((i) => i.id === where.id);
        if (!item) return null;
        return { id: item.id, email: item.email };
      },
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const item = items.find((i) => i.id === where.id);
        if (item) item.updatedData = data;
        return item;
      },
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("VerifyLeadContactEmailUseCase", () => {
  let emailVerifier: FakeEmailVerifier;

  beforeEach(() => {
    emailVerifier = new FakeEmailVerifier();
  });

  it("returns left when leadContact not found", async () => {
    const prisma = makeFakePrisma([]);
    const sut = new VerifyLeadContactEmailUseCase(emailVerifier, prisma as never);

    const result = await sut.execute({ leadContactId: "nonexistent", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não encontrado");
  });

  it("returns left when leadContact has no email", async () => {
    const prisma = makeFakePrisma([{ id: "lc-1", email: null }]);
    const sut = new VerifyLeadContactEmailUseCase(emailVerifier, prisma as never);

    const result = await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toBe("LeadContact não possui email");
  });

  it("calls verifier with leadContact email", async () => {
    const prisma = makeFakePrisma([{ id: "lc-1", email: "contato@empresa.com" }]);
    const sut = new VerifyLeadContactEmailUseCase(emailVerifier, prisma as never);

    await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });

    expect(emailVerifier.lastVerifiedEmail).toBe("contato@empresa.com");
  });

  it("saves emailVerified=true when valid", async () => {
    const items: LeadContactRecord[] = [{ id: "lc-1", email: "valid@empresa.com" }];
    const prisma = makeFakePrisma(items);
    const sut = new VerifyLeadContactEmailUseCase(emailVerifier, prisma as never);

    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };

    const result = await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const updated = items[0].updatedData!;
    expect(updated.emailVerified).toBe(true);
    expect(updated.emailVerifiedAt).toBeInstanceOf(Date);
    expect(updated.emailVerificationStatus).toBe("valid");
    expect(updated.emailVerificationReason).toBe("Email válido");
  });

  it("saves emailVerified=false when invalid", async () => {
    const items: LeadContactRecord[] = [{ id: "lc-1", email: "bad@fakeDomain.xyz" }];
    const prisma = makeFakePrisma(items);
    const sut = new VerifyLeadContactEmailUseCase(emailVerifier, prisma as never);

    emailVerifier.resultToReturn = { valid: false, status: "invalid", reason: "Sem MX" };

    const result = await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const updated = items[0].updatedData!;
    expect(updated.emailVerified).toBe(false);
    expect(updated.emailVerificationStatus).toBe("invalid");
    expect(updated.emailVerificationReason).toBe("Sem MX");
  });

  it("returns right with leadContactId, email, valid, status, reason", async () => {
    const prisma = makeFakePrisma([{ id: "lc-1", email: "test@example.com" }]);
    const sut = new VerifyLeadContactEmailUseCase(emailVerifier, prisma as never);

    const result = await sut.execute({ leadContactId: "lc-1", requesterId: "owner-1" });
    expect(result.isRight()).toBe(true);

    const value = result.value as {
      leadContactId: string;
      email: string;
      valid: boolean;
      status: string;
      reason: string;
    };
    expect(value.leadContactId).toBe("lc-1");
    expect(value.email).toBe("test@example.com");
    expect(value.valid).toBe(true);
    expect(value.status).toBe("valid");
    expect(value.reason).toBe("Email válido");
  });
});
