import { describe, it, expect, beforeEach } from "vitest";
import { GetDealsUseCase } from "@/domain/deals/application/use-cases/get-deals.use-case";
import { InMemoryDealsRepository } from "../../repositories/in-memory-deals.repository";
import { Deal } from "@/domain/deals/enterprise/entities/deal";
import { UniqueEntityID } from "@/core/unique-entity-id";

function makeDeal(id: string, overrides: Partial<{
  ownerId: string;
  title: string;
  value: number;
  status: "open" | "won" | "lost";
  stageId: string;
  closedAt: Date;
}> = {}): Deal {
  return Deal.create(
    {
      ownerId: overrides.ownerId ?? "user-1",
      title: overrides.title ?? "Deal Teste",
      value: overrides.value ?? 0,
      currency: "BRL",
      status: overrides.status ?? "open",
      stageId: overrides.stageId ?? "stage-1",
      ...(overrides.closedAt !== undefined && { closedAt: overrides.closedAt }),
    },
    new UniqueEntityID(id),
  );
}

describe("GetDealsUseCase", () => {
  let repo: InMemoryDealsRepository;
  let sut: GetDealsUseCase;

  beforeEach(() => {
    repo = new InMemoryDealsRepository();
    sut = new GetDealsUseCase(repo);
  });

  // ─── Filtros básicos já existentes ───────────────────────────────────────────

  it("retorna apenas deals do próprio usuário", async () => {
    repo.items = [
      makeDeal("d1", { ownerId: "user-1" }),
      makeDeal("d2", { ownerId: "user-1" }),
      makeDeal("d3", { ownerId: "user-2" }),
    ];

    const result = await sut.execute({ requesterId: "user-1", requesterRole: "sdr" });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.deals).toHaveLength(2);
  });

  it("filtra por status", async () => {
    repo.items = [
      makeDeal("d1", { status: "open" }),
      makeDeal("d2", { status: "won" }),
      makeDeal("d3", { status: "open" }),
    ];

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { status: "open" },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.deals).toHaveLength(2);
  });

  // ─── Filtro valueRange ────────────────────────────────────────────────────────

  describe("filtro valueRange", () => {
    it("0-10000: retorna apenas deals com valor < 10000", async () => {
      repo.items = [
        makeDeal("d1", { value: 5000 }),
        makeDeal("d2", { value: 15000 }),
        makeDeal("d3", { value: 9999 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { valueRange: "0-10000" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deals).toHaveLength(2);
        expect(result.value.deals.map((d) => d.id).sort()).toEqual(["d1", "d3"]);
      }
    });

    it("10000-50000: retorna deals com 10000 ≤ valor < 50000", async () => {
      repo.items = [
        makeDeal("d1", { value: 5000 }),
        makeDeal("d2", { value: 25000 }),
        makeDeal("d3", { value: 49999 }),
        makeDeal("d4", { value: 50000 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { valueRange: "10000-50000" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deals).toHaveLength(2);
      }
    });

    it("50000-100000: retorna deals com 50000 ≤ valor < 100000", async () => {
      repo.items = [
        makeDeal("d1", { value: 49999 }),
        makeDeal("d2", { value: 75000 }),
        makeDeal("d3", { value: 100000 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { valueRange: "50000-100000" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deals).toHaveLength(1);
        expect(result.value.deals[0].id).toBe("d2");
      }
    });

    it("100000+: retorna deals com valor ≥ 100000", async () => {
      repo.items = [
        makeDeal("d1", { value: 99999 }),
        makeDeal("d2", { value: 100000 }),
        makeDeal("d3", { value: 500000 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { valueRange: "100000+" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deals).toHaveLength(2);
      }
    });

    it("valueRange=all: retorna todos", async () => {
      repo.items = [
        makeDeal("d1", { value: 0 }),
        makeDeal("d2", { value: 999999 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { valueRange: "all" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.deals).toHaveLength(2);
    });
  });

  // ─── Filtro sortBy ────────────────────────────────────────────────────────────

  describe("filtro sortBy", () => {
    it("sortBy=value: ordena por valor ascendente", async () => {
      repo.items = [
        makeDeal("d1", { value: 30000 }),
        makeDeal("d2", { value: 10000 }),
        makeDeal("d3", { value: 20000 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { sortBy: "value", sortOrder: "asc" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const values = result.value.deals.map((d) => d.value);
        expect(values).toEqual([10000, 20000, 30000]);
      }
    });

    it("sortBy=value com sortOrder=desc: ordena por valor descendente", async () => {
      repo.items = [
        makeDeal("d1", { value: 30000 }),
        makeDeal("d2", { value: 10000 }),
        makeDeal("d3", { value: 20000 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { sortBy: "value", sortOrder: "desc" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const values = result.value.deals.map((d) => d.value);
        expect(values).toEqual([30000, 20000, 10000]);
      }
    });

    it("sortBy=title: ordena por título", async () => {
      repo.items = [
        makeDeal("d1", { title: "Zeta" }),
        makeDeal("d2", { title: "Alpha" }),
        makeDeal("d3", { title: "Mango" }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { sortBy: "title", sortOrder: "asc" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const titles = result.value.deals.map((d) => d.title);
        expect(titles).toEqual(["Alpha", "Mango", "Zeta"]);
      }
    });
  });

  // ─── Filtro closedMonth ───────────────────────────────────────────────────────

  describe("filtro closedMonth", () => {
    const jan2025Start = new Date(2025, 0, 1);
    const jan2025Mid = new Date(2025, 0, 15);
    const feb2025 = new Date(2025, 1, 10);

    it("sem filtro: retorna open + won/lost do mês corrente", async () => {
      const now = new Date();
      const currentMonthClose = new Date(now.getFullYear(), now.getMonth(), 15);
      const pastClose = new Date(2020, 0, 1);

      repo.items = [
        makeDeal("d1", { status: "open" }),
        makeDeal("d2", { status: "won", closedAt: currentMonthClose }),
        makeDeal("d3", { status: "lost", closedAt: pastClose }),
      ];

      const result = await sut.execute({ requesterId: "user-1", requesterRole: "sdr" });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const ids = result.value.deals.map((d) => d.id).sort();
        expect(ids).toContain("d1");
        expect(ids).toContain("d2");
        expect(ids).not.toContain("d3");
      }
    });

    it("closedMonth=all: retorna todos os deals", async () => {
      repo.items = [
        makeDeal("d1", { status: "open" }),
        makeDeal("d2", { status: "won", closedAt: jan2025Start }),
        makeDeal("d3", { status: "lost", closedAt: feb2025 }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { closedMonth: "all" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.deals).toHaveLength(3);
    });

    it("closedMonth=2025-01: retorna open + won/lost de janeiro 2025", async () => {
      repo.items = [
        makeDeal("d1", { status: "open" }),
        makeDeal("d2", { status: "won", closedAt: jan2025Mid }),
        makeDeal("d3", { status: "lost", closedAt: feb2025 }),
        makeDeal("d4", { status: "won", closedAt: jan2025Start }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { closedMonth: "2025-01" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        const ids = result.value.deals.map((d) => d.id).sort();
        expect(ids).toEqual(["d1", "d2", "d4"]);
      }
    });

    it("status explícito ignora closedMonth e retorna todos do status", async () => {
      repo.items = [
        makeDeal("d1", { status: "won", closedAt: jan2025Start }),
        makeDeal("d2", { status: "won", closedAt: feb2025 }),
        makeDeal("d3", { status: "open" }),
      ];

      const result = await sut.execute({
        requesterId: "user-1",
        requesterRole: "sdr",
        filters: { status: "won" },
      });

      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.deals).toHaveLength(2);
      }
    });
  });

  // ─── Combinação de filtros ────────────────────────────────────────────────────

  it("combina valueRange e sortBy", async () => {
    repo.items = [
      makeDeal("d1", { value: 5000, title: "C" }),
      makeDeal("d2", { value: 8000, title: "A" }),
      makeDeal("d3", { value: 15000, title: "B" }),
    ];

    const result = await sut.execute({
      requesterId: "user-1",
      requesterRole: "sdr",
      filters: { valueRange: "0-10000", sortBy: "title", sortOrder: "asc" },
    });

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.deals).toHaveLength(2);
      expect(result.value.deals[0].title).toBe("A");
      expect(result.value.deals[1].title).toBe("C");
    }
  });
});
