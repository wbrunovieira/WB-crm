import { describe, it, expect, beforeEach } from "vitest";
import {
  GetCampaignSourceGroupsUseCase,
  SearchEnrollableRecipientsUseCase,
  ListSuppressionsWithNamesUseCase,
} from "@/domain/email-campaigns/application/use-cases/campaign-recipient-queries.use-cases";
import { EnrollmentSourceRepository, type RecipientSearchResult, type EmailEntityNames } from "@/domain/email-campaigns/application/repositories/enrollment-source.repository";
import { EmailSuppression } from "@/domain/email-campaigns/enterprise/entities/email-suppression.entity";
import { UniqueEntityID } from "@/core/unique-entity-id";

const OWNER = "owner-1";

class FakeSource extends EnrollmentSourceRepository {
  sourceGroups: string[] = [];
  searchResults: RecipientSearchResult[] = [];
  names: Record<string, EmailEntityNames> = {};
  public searchCalls: { ownerId: string; term: string }[] = [];

  async findLeadEnrollment() { return null; }
  async findOrgEnrollment() { return null; }
  async findBulkEnrollmentCandidates() { return []; }
  async findSourceGroups(ownerId: string) { return this.sourceGroups.concat(); }
  async searchEnrollable(ownerId: string, term: string) { this.searchCalls.push({ ownerId, term }); return this.searchResults; }
  async resolveEmailEntityNames(_ownerId: string, email: string) { return this.names[email.toLowerCase()] ?? { leadName: null, contactName: null }; }
}

class FakeSuppressions {
  items: EmailSuppression[] = [];
  async findAllByOwner() { return this.items; }
}

describe("Campaign recipient query use cases", () => {
  let source: FakeSource;

  beforeEach(() => { source = new FakeSource(); });

  describe("GetCampaignSourceGroupsUseCase", () => {
    it("returns the source groups from the repository", async () => {
      source.sourceGroups = ["G-A", "G-B"];
      const sut = new GetCampaignSourceGroupsUseCase(source);
      expect(await sut.execute(OWNER)).toEqual(["G-A", "G-B"]);
    });
  });

  describe("SearchEnrollableRecipientsUseCase", () => {
    it("returns [] without hitting the repo when the query is shorter than 2 chars", async () => {
      const sut = new SearchEnrollableRecipientsUseCase(source);
      expect(await sut.execute({ ownerId: OWNER, query: "a" })).toEqual([]);
      expect(await sut.execute({ ownerId: OWNER, query: "  " })).toEqual([]);
      expect(source.searchCalls).toHaveLength(0);
    });

    it("trims the term and delegates to the repo", async () => {
      source.searchResults = [{ key: "lead:1", entityType: "lead", entityId: "1", name: "X", emailCount: 2, previewEmails: ["a@x.com"] }];
      const sut = new SearchEnrollableRecipientsUseCase(source);
      const r = await sut.execute({ ownerId: OWNER, query: "  acme  " });
      expect(source.searchCalls).toEqual([{ ownerId: OWNER, term: "acme" }]);
      expect(r).toHaveLength(1);
    });
  });

  describe("ListSuppressionsWithNamesUseCase", () => {
    it("enriches each suppression with resolved names and sorts by createdAt desc", async () => {
      const suppressions = new FakeSuppressions();
      const older = EmailSuppression.reconstitute({ email: "old@x.com", ownerId: OWNER, reason: "bounced", createdAt: new Date("2026-01-01") }, new UniqueEntityID());
      const newer = EmailSuppression.reconstitute({ email: "new@x.com", ownerId: OWNER, reason: "unsubscribed", createdAt: new Date("2026-02-01") }, new UniqueEntityID());
      suppressions.items = [older, newer];
      source.names["new@x.com"] = { leadName: "Empresa Nova", contactName: "Ana" };

      const sut = new ListSuppressionsWithNamesUseCase(suppressions as never, source);
      const result = await sut.execute(OWNER);

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe("new@x.com"); // newer first
      expect(result[0].leadName).toBe("Empresa Nova");
      expect(result[0].contactName).toBe("Ana");
      expect(result[1].email).toBe("old@x.com");
      expect(result[1].leadName).toBeNull();
    });
  });
});
