import { describe, it, expect, beforeEach } from "vitest";
import { BulkEnrollUseCase } from "@/domain/email-campaigns/application/use-cases/bulk-enroll.use-case";
import { InMemoryEmailCampaignsRepository } from "../fakes/in-memory-email-campaigns.repository";
import { InMemoryEmailCampaignRecipientsRepository } from "../fakes/in-memory-email-campaign-recipients.repository";
import { CreateEmailCampaignUseCase } from "@/domain/email-campaigns/application/use-cases/create-email-campaign.use-case";
import { EnrollmentSourceRepository, type EnrollmentCandidate } from "@/domain/email-campaigns/application/repositories/enrollment-source.repository";

const OWNER = "owner-1";
const FROM = "bruno@wbdigitalsolutions.com";

class FakeEnrollmentSource extends EnrollmentSourceRepository {
  candidates: EnrollmentCandidate[] = [];
  public lastArgs: { ownerId: string; sourceGroup?: string } | null = null;
  async findLeadEnrollment() { return null; }
  async findOrgEnrollment() { return null; }
  async findBulkEnrollmentCandidates(ownerId: string, sourceGroup?: string) {
    this.lastArgs = { ownerId, sourceGroup };
    return this.candidates;
  }
}

function candidate(over: Partial<EnrollmentCandidate> & { recipientId: string; email: string }): EnrollmentCandidate {
  return {
    dedupKey: `${over.recipientType ?? "CONTACT"}:${over.recipientId}`,
    recipientType: over.recipientType ?? "CONTACT",
    name: undefined, company: undefined, role: undefined, customVars: undefined,
    ...over,
  };
}

describe("BulkEnrollUseCase", () => {
  let campaigns: InMemoryEmailCampaignsRepository;
  let recipients: InMemoryEmailCampaignRecipientsRepository;
  let source: FakeEnrollmentSource;
  let sut: BulkEnrollUseCase;
  let campaignId: string;

  beforeEach(async () => {
    campaigns = new InMemoryEmailCampaignsRepository();
    recipients = new InMemoryEmailCampaignRecipientsRepository();
    source = new FakeEnrollmentSource();
    sut = new BulkEnrollUseCase(source, campaigns, recipients);

    const created = await new CreateEmailCampaignUseCase(campaigns).execute({ name: "Bulk", fromEmail: FROM, ownerId: OWNER });
    campaignId = (created.value as { id: string }).id;
  });

  it("returns left when campaign not found", async () => {
    const r = await sut.execute({ campaignId: "nope", ownerId: OWNER, mode: "all" });
    expect(r.isLeft()).toBe(true);
  });

  it("returns left (Forbidden) when the campaign belongs to another owner", async () => {
    const r = await sut.execute({ campaignId, ownerId: "another", mode: "all" });
    expect(r.isLeft()).toBe(true);
    expect((r.value as Error).message).toBe("Forbidden");
  });

  it("enrolls all valid candidates", async () => {
    source.candidates = [
      candidate({ recipientId: "l1", email: "a@x.com", recipientType: "LEAD", dedupKey: "LEAD:l1" }),
      candidate({ recipientId: "c1", email: "b@x.com" }),
    ];
    const r = await sut.execute({ campaignId, ownerId: OWNER, mode: "all" });
    expect(r.isRight()).toBe(true);
    expect(r.unwrap().enrolled).toBe(2);
    expect(recipients.items).toHaveLength(2);
  });

  it("skips candidates with an invalid email (via EmailAddress VO) and counts them", async () => {
    source.candidates = [
      candidate({ recipientId: "ok", email: "valid@x.com" }),
      candidate({ recipientId: "bad", email: "not-an-email" }),
      candidate({ recipientId: "bad2", email: "missing-domain@" }),
    ];
    const r = await sut.execute({ campaignId, ownerId: OWNER, mode: "all" });
    expect(r.unwrap().enrolled).toBe(1);
    expect(r.unwrap().skipped).toBe(2);
  });

  it("dedups by dedupKey (same entity not enrolled twice)", async () => {
    source.candidates = [
      candidate({ recipientId: "c1", email: "a@x.com", dedupKey: "CONTACT:c1" }),
      candidate({ recipientId: "c1", email: "a2@x.com", dedupKey: "CONTACT:c1" }),
    ];
    const r = await sut.execute({ campaignId, ownerId: OWNER, mode: "all" });
    expect(r.unwrap().enrolled).toBe(1);
    expect(r.unwrap().skipped).toBe(1);
  });

  it("dedups by email across different sources (same address once)", async () => {
    source.candidates = [
      candidate({ recipientId: "l1", email: "Same@X.com", recipientType: "LEAD", dedupKey: "LEAD:l1" }),
      candidate({ recipientId: "c1", email: "same@x.com", dedupKey: "CONTACT:c1" }),
    ];
    const r = await sut.execute({ campaignId, ownerId: OWNER, mode: "all" });
    expect(r.unwrap().enrolled).toBe(1);
    expect(r.unwrap().skipped).toBe(1);
  });

  it("skips candidates already enrolled in the campaign", async () => {
    source.candidates = [candidate({ recipientId: "c1", email: "a@x.com", dedupKey: "CONTACT:c1" })];
    await sut.execute({ campaignId, ownerId: OWNER, mode: "all" });

    // same candidate again → already in campaign
    const r = await sut.execute({ campaignId, ownerId: OWNER, mode: "all" });
    expect(r.unwrap().enrolled).toBe(0);
    expect(r.unwrap().skipped).toBe(1);
  });

  it("passes the sourceGroup filter through to the source in sourceGroup mode", async () => {
    source.candidates = [];
    await sut.execute({ campaignId, ownerId: OWNER, mode: "sourceGroup", sourceGroup: "G-2026" });
    expect(source.lastArgs).toEqual({ ownerId: OWNER, sourceGroup: "G-2026" });
  });

  it("does not pass a sourceGroup in 'all' mode", async () => {
    source.candidates = [];
    await sut.execute({ campaignId, ownerId: OWNER, mode: "all" });
    expect(source.lastArgs).toEqual({ ownerId: OWNER, sourceGroup: undefined });
  });
});
