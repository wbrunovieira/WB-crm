import { describe, it, expect, beforeEach } from "vitest";
import { QualifyLeadUseCase } from "@/domain/leads/application/use-cases/qualify-lead.use-case";
import { BulkArchiveLeadsUseCase } from "@/domain/leads/application/use-cases/bulk-archive-leads.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";

const makeLead = (ownerId = "user-1", businessName = "Empresa") =>
  Lead.create({ ownerId, businessName });

// ─── QualifyLeadUseCase ───────────────────────────────────────────────────────

describe("QualifyLeadUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: QualifyLeadUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new QualifyLeadUseCase(repo);
  });

  it("qualifica lead do próprio usuário", async () => {
    const lead = makeLead("user-1");
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    const saved = await repo.findByIdRaw(lead.id.toString());
    expect(saved?.status).toBe("qualified");
  });

  it("admin qualifica lead de outro usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "admin-1", requesterRole: "admin" });

    expect(result.isRight()).toBe(true);
  });

  it("retorna QualifyLeadNotFoundError para lead inexistente", async () => {
    const result = await sut.execute({ id: "nao-existe", requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.name).toBe("QualifyLeadNotFoundError");
  });

  it("retorna QualifyLeadForbiddenError para lead de outro usuário", async () => {
    const lead = makeLead("user-2");
    await repo.save(lead);

    const result = await sut.execute({ id: lead.id.toString(), requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.name).toBe("QualifyLeadForbiddenError");
  });
});

// ─── BulkArchiveLeadsUseCase ──────────────────────────────────────────────────

describe("BulkArchiveLeadsUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: BulkArchiveLeadsUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new BulkArchiveLeadsUseCase(repo);
  });

  it("arquiva múltiplos leads do próprio usuário", async () => {
    const l1 = makeLead("user-1");
    const l2 = makeLead("user-1");
    await repo.save(l1);
    await repo.save(l2);

    const result = await sut.execute({
      ids: [l1.id.toString(), l2.id.toString()],
      requesterId: "user-1",
      requesterRole: "sdr",
      reason: "Sem interesse",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.archived).toBe(2);
      expect(result.value.skipped).toBe(0);
    }
    expect((await repo.findByIdRaw(l1.id.toString()))?.isArchived).toBe(true);
  });

  it("pula lead não encontrado e lead de outro usuário", async () => {
    const l1 = makeLead("user-2");
    await repo.save(l1);

    const result = await sut.execute({
      ids: ["nao-existe", l1.id.toString()],
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.archived).toBe(0);
      expect(result.value.skipped).toBe(2);
    }
  });

  it("pula lead já arquivado", async () => {
    const lead = makeLead("user-1");
    lead.archive("já estava");
    await repo.save(lead);

    const result = await sut.execute({
      ids: [lead.id.toString()],
      requesterId: "user-1",
      requesterRole: "sdr",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.archived).toBe(0);
      expect(result.value.skipped).toBe(1);
    }
  });

  it("admin arquiva leads de qualquer owner", async () => {
    const l1 = makeLead("user-1");
    const l2 = makeLead("user-2");
    await repo.save(l1);
    await repo.save(l2);

    const result = await sut.execute({
      ids: [l1.id.toString(), l2.id.toString()],
      requesterId: "admin-1",
      requesterRole: "admin",
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.archived).toBe(2);
      expect(result.value.skipped).toBe(0);
    }
  });
});
