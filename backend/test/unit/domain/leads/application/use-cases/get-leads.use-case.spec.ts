import { describe, it, expect, beforeEach } from "vitest";
import { GetLeadsUseCase } from "@/domain/leads/application/use-cases/get-leads.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

function makeLead(id: string, overrides: Parameters<typeof Lead.create>[0] = {}): Lead {
  return Lead.create(
    { ownerId: "user-1", businessName: "Empresa Teste", ...overrides },
    new UniqueEntityID(id),
  );
}

describe("GetLeadsUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: GetLeadsUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new GetLeadsUseCase(repo);
  });

  // ─── Filtros básicos (já existentes) ─────────────────────────────────────────

  it("retorna apenas leads do próprio usuário", async () => {
    repo.items = [
      makeLead("l1", { ownerId: "user-1", businessName: "Alpha" }),
      makeLead("l2", { ownerId: "user-1", businessName: "Beta" }),
      makeLead("l3", { ownerId: "user-2", businessName: "Gamma" }),
    ];

    const result = await sut.execute({ requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(2);
    }
  });

  it("admin vê todos os leads", async () => {
    repo.items = [
      makeLead("l1", { ownerId: "user-1" }),
      makeLead("l2", { ownerId: "user-2" }),
    ];

    const result = await sut.execute({ requesterId: "admin-1", requesterRole: "admin" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.total).toBe(2);
    }
  });

  it("filtra por status", async () => {
    repo.items = [
      makeLead("l1", { status: "new" }),
      makeLead("l2", { status: "qualified" }),
      makeLead("l3", { status: "new" }),
    ];

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { status: "new" },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.leads).toHaveLength(2);
    }
  });

  it("filtra por quality", async () => {
    repo.items = [
      makeLead("l1", { quality: "hot" }),
      makeLead("l2", { quality: "cold" }),
      makeLead("l3", { quality: "hot" }),
    ];

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { quality: "hot" },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.leads).toHaveLength(2);
    }
  });

  it("filtra leads arquivados", async () => {
    repo.items = [
      makeLead("l1", { isArchived: false }),
      makeLead("l2", { isArchived: true }),
      makeLead("l3", { isArchived: true }),
    ];

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { isArchived: true },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.leads).toHaveLength(2);
    }
  });

  it("filtra por busca no nome da empresa", async () => {
    repo.items = [
      makeLead("l1", { businessName: "Acme Corp" }),
      makeLead("l2", { businessName: "Beta Solutions" }),
      makeLead("l3", { businessName: "Acme Digital" }),
    ];

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { search: "acme" },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.leads).toHaveLength(2);
    }
  });

  it("pagina corretamente", async () => {
    repo.items = Array.from({ length: 10 }, (_, i) =>
      makeLead(`l${i}`, { businessName: `Empresa ${i}` }),
    );

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { page: 2, pageSize: 3 },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.leads).toHaveLength(3);
      expect(result.value.total).toBe(10);
      expect(result.value.page).toBe(2);
    }
  });

  // ─── Filtro contactSearch ─────────────────────────────────────────────────────

  describe("filtro contactSearch", () => {
    it("retorna leads cujos contatos têm nome que bate com a busca", async () => {
      repo.items = [
        makeLead("l1", { businessName: "Alpha" }),
        makeLead("l2", { businessName: "Beta" }),
        makeLead("l3", { businessName: "Gamma" }),
      ];
      // Armazena contatos associados no repositório
      repo.leadContacts.set("l1", ["João Silva", "Maria"]);
      repo.leadContacts.set("l2", ["Carlos"]);
      repo.leadContacts.set("l3", ["João Pedro"]);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { contactSearch: "joão" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(2);
        const names = result.value.leads.map((l) => l.businessName);
        expect(names).toContain("Alpha");
        expect(names).toContain("Gamma");
      }
    });

    it("retorna vazio quando nenhum contato bate", async () => {
      repo.items = [makeLead("l1", { businessName: "Alpha" })];
      repo.leadContacts.set("l1", ["Carlos"]);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { contactSearch: "xyz" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(0);
      }
    });

    it("busca sem contatos cadastrados retorna vazio", async () => {
      repo.items = [makeLead("l1", { businessName: "Alpha" })];
      // Sem dados em leadContacts

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { contactSearch: "joão" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(0);
      }
    });
  });

  // ─── Filtro icpId ─────────────────────────────────────────────────────────────

  describe("filtro icpId", () => {
    it("retorna apenas leads vinculados ao ICP informado", async () => {
      repo.items = [
        makeLead("l1", { businessName: "Alpha" }),
        makeLead("l2", { businessName: "Beta" }),
        makeLead("l3", { businessName: "Gamma" }),
      ];
      repo.leadIcps.set("l1", ["icp-A", "icp-B"]);
      repo.leadIcps.set("l2", ["icp-B"]);
      repo.leadIcps.set("l3", []);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { icpId: "icp-A" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(1);
        expect(result.value.leads[0].id).toBe("l1");
      }
    });

    it("retorna leads que compartilham o mesmo ICP", async () => {
      repo.items = [
        makeLead("l1"),
        makeLead("l2"),
        makeLead("l3"),
      ];
      repo.leadIcps.set("l1", ["icp-B"]);
      repo.leadIcps.set("l2", ["icp-B", "icp-C"]);
      repo.leadIcps.set("l3", ["icp-A"]);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { icpId: "icp-B" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(2);
      }
    });

    it("retorna vazio quando nenhum lead tem o ICP informado", async () => {
      repo.items = [makeLead("l1")];
      repo.leadIcps.set("l1", ["icp-A"]);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { icpId: "icp-Z" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(0);
      }
    });
  });

  // ─── Filtro hasCadence ────────────────────────────────────────────────────────

  describe("filtro hasCadence", () => {
    it("hasCadence=yes retorna apenas leads COM cadência", async () => {
      repo.items = [
        makeLead("l1"),
        makeLead("l2"),
        makeLead("l3"),
      ];
      repo.leadHasCadence.set("l1", true);
      repo.leadHasCadence.set("l2", false);
      repo.leadHasCadence.set("l3", true);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { hasCadence: "yes" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(2);
      }
    });

    it("hasCadence=no retorna apenas leads SEM cadência", async () => {
      repo.items = [
        makeLead("l1"),
        makeLead("l2"),
        makeLead("l3"),
      ];
      repo.leadHasCadence.set("l1", true);
      repo.leadHasCadence.set("l2", false);
      repo.leadHasCadence.set("l3", false);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { hasCadence: "no" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(2);
      }
    });

    it("sem filtro hasCadence retorna todos os leads", async () => {
      repo.items = [makeLead("l1"), makeLead("l2")];
      repo.leadHasCadence.set("l1", true);
      repo.leadHasCadence.set("l2", false);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(2);
      }
    });
  });

  // ─── Combinação de filtros ────────────────────────────────────────────────────

  describe("combinação de filtros", () => {
    it("combina icpId e status", async () => {
      repo.items = [
        makeLead("l1", { status: "qualified" }),
        makeLead("l2", { status: "new" }),
        makeLead("l3", { status: "qualified" }),
      ];
      repo.leadIcps.set("l1", ["icp-A"]);
      repo.leadIcps.set("l2", ["icp-A"]);
      repo.leadIcps.set("l3", ["icp-B"]);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { icpId: "icp-A", status: "qualified" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(1);
        expect(result.value.leads[0].id).toBe("l1");
      }
    });

    it("combina contactSearch e hasCadence=no", async () => {
      repo.items = [
        makeLead("l1", { businessName: "Alpha" }),
        makeLead("l2", { businessName: "Beta" }),
        makeLead("l3", { businessName: "Gamma" }),
      ];
      repo.leadContacts.set("l1", ["Ana"]);
      repo.leadContacts.set("l2", ["Ana"]);
      repo.leadContacts.set("l3", ["Carlos"]);
      repo.leadHasCadence.set("l1", false);
      repo.leadHasCadence.set("l2", true);
      repo.leadHasCadence.set("l3", false);

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { contactSearch: "ana", hasCadence: "no" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.leads).toHaveLength(1);
        expect(result.value.leads[0].id).toBe("l1");
      }
    });
  });
});
