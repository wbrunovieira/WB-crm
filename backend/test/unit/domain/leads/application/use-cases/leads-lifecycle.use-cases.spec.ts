import { describe, it, expect, beforeEach } from "vitest";
import { UniqueEntityID } from "@/core/unique-entity-id";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { ArchiveLeadUseCase } from "@/domain/leads/application/use-cases/archive-lead.use-case";
import { UnarchiveLeadUseCase } from "@/domain/leads/application/use-cases/unarchive-lead.use-case";
import { DeleteLeadUseCase } from "@/domain/leads/application/use-cases/delete-lead.use-case";
import { QualifyLeadUseCase, QualifyLeadNotFoundError, QualifyLeadForbiddenError } from "@/domain/leads/application/use-cases/qualify-lead.use-case";

const OWNER = "owner-1";
const OTHER = "owner-2";

function lead(id: string, ownerId = OWNER) {
  return Lead.create({ ownerId, businessName: `Empresa ${id}`, status: "new" }, new UniqueEntityID(id));
}

describe("Leads lifecycle use cases", () => {
  let repo: InMemoryLeadsRepository;
  beforeEach(() => { repo = new InMemoryLeadsRepository(); });

  describe("ArchiveLeadUseCase", () => {
    it("dono → arquiva com motivo e salva", async () => {
      repo.items.push(lead("a"));
      const r = await new ArchiveLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr", reason: "sem interesse" });
      expect(r.isRight()).toBe(true);
      const saved = await repo.findByIdRaw("a");
      expect(saved!.isArchived).toBe(true);
      expect(saved!.archivedReason).toBe("sem interesse");
    });
    it("inexistente → left", async () => {
      const r = await new ArchiveLeadUseCase(repo).execute({ id: "x", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
    });
    it("outro dono + não admin → left, não arquiva", async () => {
      repo.items.push(lead("a", OTHER));
      const r = await new ArchiveLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
      expect((await repo.findByIdRaw("a"))!.isArchived).toBe(false);
    });
    it("admin arquiva de qualquer dono", async () => {
      repo.items.push(lead("a", OTHER));
      const r = await new ArchiveLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "admin" });
      expect(r.isRight()).toBe(true);
      expect((await repo.findByIdRaw("a"))!.isArchived).toBe(true);
    });
  });

  describe("UnarchiveLeadUseCase", () => {
    it("dono → desarquiva", async () => {
      const l = lead("a"); l.archive("x"); repo.items.push(l);
      const r = await new UnarchiveLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
      expect((await repo.findByIdRaw("a"))!.isArchived).toBe(false);
    });
    it("outro dono → left", async () => {
      const l = lead("a", OTHER); l.archive("x"); repo.items.push(l);
      const r = await new UnarchiveLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
      expect((await repo.findByIdRaw("a"))!.isArchived).toBe(true);
    });
  });

  describe("DeleteLeadUseCase", () => {
    it("dono → deleta", async () => {
      repo.items.push(lead("a"));
      const r = await new DeleteLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
      expect(await repo.findByIdRaw("a")).toBeNull();
    });
    it("inexistente → left", async () => {
      const r = await new DeleteLeadUseCase(repo).execute({ id: "x", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
    });
    it("outro dono → left, não deleta", async () => {
      repo.items.push(lead("a", OTHER));
      const r = await new DeleteLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isLeft()).toBe(true);
      expect(await repo.findByIdRaw("a")).not.toBeNull();
    });
  });

  describe("QualifyLeadUseCase", () => {
    it("dono → qualifica (status qualified)", async () => {
      repo.items.push(lead("a"));
      const r = await new QualifyLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      expect(r.isRight()).toBe(true);
      expect((await repo.findByIdRaw("a"))!.status).toBe("qualified");
    });
    it("inexistente → QualifyLeadNotFoundError", async () => {
      const r = await new QualifyLeadUseCase(repo).execute({ id: "x", requesterId: OWNER, requesterRole: "sdr" });
      if (r.isLeft()) expect(r.value).toBeInstanceOf(QualifyLeadNotFoundError);
      else throw new Error("esperava left");
    });
    it("outro dono → QualifyLeadForbiddenError, não qualifica", async () => {
      repo.items.push(lead("a", OTHER));
      const r = await new QualifyLeadUseCase(repo).execute({ id: "a", requesterId: OWNER, requesterRole: "sdr" });
      if (r.isLeft()) expect(r.value).toBeInstanceOf(QualifyLeadForbiddenError);
      else throw new Error("esperava left");
      expect((await repo.findByIdRaw("a"))!.status).toBe("new");
    });
  });
});
