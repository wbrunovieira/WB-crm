import { describe, it, expect, beforeEach } from "vitest";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { MetaAdsCheckerPort, type MetaAdsResult } from "@/domain/integrations/meta-ads/application/ports/meta-ads-checker.port";
import { BatchVerifyLeadMetaAdsUseCase } from "@/domain/integrations/meta-ads/application/use-cases/batch-verify-lead-meta-ads.use-case";

const OWNER = "owner-1";
const GROUP = "grupo-meta";

class FakeMetaAdsChecker extends MetaAdsCheckerPort {
  public callCount = 0;
  public result: MetaAdsResult = { hasAds: true, activeCount: 2, checkedAt: new Date("2026-01-01T00:00:00Z"), searchTerm: "x" };
  async check(handle: string): Promise<MetaAdsResult> {
    this.callCount++;
    return { ...this.result, searchTerm: handle };
  }
}

class InMemoryMetaAdsLeadsRepository {
  leads: Lead[] = [];
  saved: Array<{ leadId: string; json: string }> = [];
  async findBySourceGroup(sourceGroup: string): Promise<Lead[]> {
    return this.leads.filter((l) => l.sourceGroup === sourceGroup);
  }
  async saveMetaAds(leadId: string, json: string): Promise<void> {
    this.saved.push({ leadId, json });
  }
}

function makeLead(id: string, overrides: Partial<{ instagram: string; ownerId: string }> = {}) {
  return Lead.create({
    ownerId: overrides.ownerId ?? OWNER,
    businessName: `Empresa ${id}`,
    instagram: overrides.instagram,
    sourceGroup: GROUP,
  }, new UniqueEntityID(id));
}

describe("BatchVerifyLeadMetaAdsUseCase", () => {
  let checker: FakeMetaAdsChecker;
  let repo: InMemoryMetaAdsLeadsRepository;
  let sut: BatchVerifyLeadMetaAdsUseCase;

  function runBatch(input: Partial<Parameters<BatchVerifyLeadMetaAdsUseCase["execute"]>[0]> & { sourceGroup: string }) {
    return sut.execute({ requesterId: OWNER, requesterRole: "sdr", ...input });
  }

  beforeEach(() => {
    checker = new FakeMetaAdsChecker();
    repo = new InMemoryMetaAdsLeadsRepository();
    sut = new BatchVerifyLeadMetaAdsUseCase(checker as never, repo as never);
  });

  it("returns left when sourceGroup is empty", async () => {
    const result = await runBatch({ sourceGroup: "" });
    expect(result.isLeft()).toBe(true);
  });

  it("returns left when no leads found for the group", async () => {
    const result = await runBatch({ sourceGroup: GROUP });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).message).toContain("Nenhum lead encontrado");
  });

  it("checks leads with an instagram handle and persists the result", async () => {
    repo.leads.push(makeLead("a", { instagram: "@empresa_a" }));

    const result = await runBatch({ sourceGroup: GROUP });
    expect(result.isRight()).toBe(true);
    expect(checker.callCount).toBe(1);
    expect(repo.saved).toHaveLength(1);
    if (result.isRight()) {
      expect(result.value.total).toBe(1);
      expect(result.value.checked).toBe(1);
      expect(result.value.withAds).toBe(1);
    }
  });

  it("pula lead sem instagram (skipped++, não chama o checker)", async () => {
    repo.leads.push(makeLead("sem-ig", { instagram: undefined }));

    const result = await runBatch({ sourceGroup: GROUP });
    expect(result.isRight()).toBe(true);
    expect(checker.callCount).toBe(0);
    expect(repo.saved).toHaveLength(0);
    if (result.isRight()) {
      expect(result.value.total).toBe(1);
      expect(result.value.skipped).toBe(1);
      expect(result.value.checked).toBe(0);
    }
  });

  it("pula lead cujo handle normaliza para vazio (instagram = '@')", async () => {
    repo.leads.push(makeLead("ig-vazio", { instagram: "@" }));

    const result = await runBatch({ sourceGroup: GROUP });
    expect(result.isRight()).toBe(true);
    expect(checker.callCount).toBe(0); // não chama o checker com handle vazio
    if (result.isRight()) expect(result.value.skipped).toBe(1);
  });

  // ── Authorization / data isolation ────────────────────────────────────────────

  it("only checks leads owned by the requester (skips other owners')", async () => {
    repo.leads.push(makeLead("mine", { instagram: "@mine" }));
    repo.leads.push(makeLead("theirs", { instagram: "@theirs", ownerId: "another-user" }));

    const result = await runBatch({ sourceGroup: GROUP });
    expect(result.isRight()).toBe(true);
    expect(checker.callCount).toBe(1);
    expect(repo.saved).toEqual([expect.objectContaining({ leadId: "mine" })]);
    if (result.isRight()) expect(result.value.total).toBe(1);
  });

  it("lets an admin check every lead regardless of owner", async () => {
    repo.leads.push(makeLead("a", { instagram: "@a" }));
    repo.leads.push(makeLead("b", { instagram: "@b", ownerId: "another-user" }));

    const result = await runBatch({ sourceGroup: GROUP, requesterRole: "admin", requesterId: "admin-user" });
    expect(result.isRight()).toBe(true);
    expect(checker.callCount).toBe(2);
  });

  it("returns left when the requester owns none of the leads", async () => {
    repo.leads.push(makeLead("theirs", { instagram: "@theirs", ownerId: "another-user" }));

    const result = await runBatch({ sourceGroup: GROUP });
    expect(result.isLeft()).toBe(true);
    expect(checker.callCount).toBe(0);
  });
});
