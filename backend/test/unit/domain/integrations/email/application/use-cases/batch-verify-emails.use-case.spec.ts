import { describe, it, expect, beforeEach, vi } from "vitest";
import { InMemoryLeadsRepository } from "@test/unit/domain/leads/repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { EmailVerifierPort, EmailVerificationResult } from "@/domain/integrations/email/application/ports/email-verifier.port";
import { BatchVerifyEmailsUseCase, BatchVerifyEmailsProgress } from "@/domain/integrations/email/application/use-cases/batch-verify-emails.use-case";

class FakeEmailVerifier extends EmailVerifierPort {
  public callCount = 0;
  public emailsVerified: string[] = [];
  public resultToReturn: EmailVerificationResult = {
    valid: true,
    status: "valid",
    reason: "Email válido",
  };

  async verify(email: string): Promise<EmailVerificationResult> {
    this.callCount++;
    this.emailsVerified.push(email);
    return this.resultToReturn;
  }
}

const OWNER = "owner-1";

function makeLead(id: string, email?: string, sourceGroup = "GroupA", ownerId = OWNER) {
  return Lead.create({
    ownerId,
    businessName: `Empresa ${id}`,
    email,
    sourceGroup,
  }, new UniqueEntityID(id));
}

describe("BatchVerifyEmailsUseCase", () => {
  let leadsRepo: InMemoryLeadsRepository;
  let emailVerifier: FakeEmailVerifier;
  let sut: BatchVerifyEmailsUseCase;

  // Defaults requester to the owner of the seeded leads unless overridden.
  function runBatch(input: Partial<Parameters<BatchVerifyEmailsUseCase["execute"]>[0]> & { sourceGroup: string }) {
    return sut.execute({ requesterId: OWNER, requesterRole: "sdr", delayMs: 0, ...input });
  }

  beforeEach(() => {
    leadsRepo = new InMemoryLeadsRepository();
    emailVerifier = new FakeEmailVerifier();
    sut = new BatchVerifyEmailsUseCase(emailVerifier, leadsRepo);
  });

  it("returns left when no leads found for sourceGroup", async () => {
    const result = await runBatch({ sourceGroup: "NonExistentGroup", delayMs: 0 });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("sourceGroup");
  });

  it("processes all leads, calling verifier for each with email", async () => {
    leadsRepo.items.push(makeLead("lead-1", "a@test.com"));
    leadsRepo.items.push(makeLead("lead-2", "b@test.com"));
    leadsRepo.items.push(makeLead("lead-3", "c@test.com"));

    const result = await runBatch({ sourceGroup: "GroupA", delayMs: 0 });
    expect(result.isRight()).toBe(true);
    expect(emailVerifier.callCount).toBe(3);
    expect(emailVerifier.emailsVerified).toContain("a@test.com");
    expect(emailVerifier.emailsVerified).toContain("b@test.com");
    expect(emailVerifier.emailsVerified).toContain("c@test.com");
  });

  it("calls onProgress after each lead with required fields", async () => {
    leadsRepo.items.push(makeLead("lead-1", "a@test.com"));
    leadsRepo.items.push(makeLead("lead-2", "b@test.com"));

    const progressEvents: BatchVerifyEmailsProgress[] = [];
    await runBatch({
      sourceGroup: "GroupA",
      delayMs: 0,
      onProgress: (p) => progressEvents.push(p),
    });

    expect(progressEvents).toHaveLength(2);
    expect(progressEvents[0].current).toBe(1);
    expect(progressEvents[0].total).toBe(2);
    expect(progressEvents[0].leadId).toBe("lead-1");
    expect(progressEvents[0].businessName).toBe("Empresa lead-1");
    expect(typeof progressEvents[0].valid).toBe("boolean");
    expect(progressEvents[0].status).toBeDefined();
    expect(progressEvents[0].reason).toBeDefined();
    expect(progressEvents[1].current).toBe(2);
  });

  it("skips leads without email and still calls onProgress", async () => {
    leadsRepo.items.push(makeLead("lead-1", "a@test.com"));
    leadsRepo.items.push(makeLead("lead-2")); // no email
    leadsRepo.items.push(makeLead("lead-3", "c@test.com"));

    const progressEvents: BatchVerifyEmailsProgress[] = [];
    const result = await runBatch({
      sourceGroup: "GroupA",
      delayMs: 0,
      onProgress: (p) => progressEvents.push(p),
    });

    expect(result.isRight()).toBe(true);
    const value = result.value as { total: number; checked: number; valid: number; invalid: number; skipped: number; errors: number };
    expect(value.skipped).toBe(1);
    expect(value.checked).toBe(2);
    // onProgress called for all 3 (including skipped)
    expect(progressEvents).toHaveLength(3);
    // The skipped one has null valid
    const skippedEvent = progressEvents.find(p => p.leadId === "lead-2");
    expect(skippedEvent).toBeDefined();
    expect(skippedEvent?.valid).toBeNull();
  });

  it("returns right with summary { total, checked, valid, invalid, skipped, errors }", async () => {
    emailVerifier.resultToReturn = { valid: true, status: "valid", reason: "Email válido" };
    leadsRepo.items.push(makeLead("lead-1", "a@test.com"));
    leadsRepo.items.push(makeLead("lead-2")); // skipped
    leadsRepo.items.push(makeLead("lead-3", "c@test.com"));

    const result = await runBatch({ sourceGroup: "GroupA", delayMs: 0 });
    expect(result.isRight()).toBe(true);

    const value = result.value as { total: number; checked: number; valid: number; invalid: number; skipped: number; errors: number };
    expect(value.total).toBe(3);
    expect(value.checked).toBe(2);
    expect(value.valid).toBe(2);
    expect(value.invalid).toBe(0);
    expect(value.skipped).toBe(1);
    expect(value.errors).toBe(0);
  });

  it("uses delayMs=0 without sleeping (fast test)", async () => {
    leadsRepo.items.push(makeLead("lead-1", "a@test.com"));
    leadsRepo.items.push(makeLead("lead-2", "b@test.com"));

    const start = Date.now();
    await runBatch({ sourceGroup: "GroupA", delayMs: 0 });
    const elapsed = Date.now() - start;

    // With delayMs=0, should be very fast (under 500ms)
    expect(elapsed).toBeLessThan(500);
  });

  // ── Authorization / data isolation ────────────────────────────────────────────

  it("only verifies leads owned by the requester (skips other owners' leads)", async () => {
    leadsRepo.items.push(makeLead("mine", "mine@test.com", "GroupA", OWNER));
    leadsRepo.items.push(makeLead("theirs", "theirs@test.com", "GroupA", "another-user"));

    const result = await runBatch({ sourceGroup: "GroupA" });

    expect(result.isRight()).toBe(true);
    expect(emailVerifier.callCount).toBe(1);
    expect(emailVerifier.emailsVerified).toEqual(["mine@test.com"]);
    const value = result.value as { total: number };
    expect(value.total).toBe(1);
    // The other owner's lead was never persisted
    expect(leadsRepo.items.find(l => l.id.toString() === "theirs")!.emailVerificationStatus).toBeUndefined();
  });

  it("lets an admin verify every lead in the sourceGroup regardless of owner", async () => {
    leadsRepo.items.push(makeLead("a", "a@test.com", "GroupA", OWNER));
    leadsRepo.items.push(makeLead("b", "b@test.com", "GroupA", "another-user"));

    const result = await runBatch({ sourceGroup: "GroupA", requesterRole: "admin", requesterId: "admin-user" });

    expect(result.isRight()).toBe(true);
    expect(emailVerifier.callCount).toBe(2);
  });

  it("returns left when the requester owns none of the leads in the sourceGroup", async () => {
    leadsRepo.items.push(makeLead("theirs", "theirs@test.com", "GroupA", "another-user"));

    const result = await runBatch({ sourceGroup: "GroupA" });

    expect(result.isLeft()).toBe(true);
    expect(emailVerifier.callCount).toBe(0);
  });
});
