import { describe, it, expect, beforeEach } from "vitest";
import { GetLeadSourceGroupsUseCase } from "@/domain/leads/application/use-cases/get-lead-source-groups.use-case";
import { InMemoryLeadsRepository } from "../../repositories/in-memory-leads.repository";
import { Lead } from "@/domain/leads/enterprise/entities/lead";
import { UniqueEntityID } from "@/core/unique-entity-id";

function makeLead(id: string, sourceGroup?: string): Lead {
  const lead = Lead.create(
    { ownerId: "user-1", businessName: "Empresa" } as Parameters<typeof Lead.create>[0],
    new UniqueEntityID(id),
  );
  if (sourceGroup) lead.update({ sourceGroup });
  return lead;
}

describe("GetLeadSourceGroupsUseCase", () => {
  let repo: InMemoryLeadsRepository;
  let sut: GetLeadSourceGroupsUseCase;

  beforeEach(() => {
    repo = new InMemoryLeadsRepository();
    sut = new GetLeadSourceGroupsUseCase(repo);
  });

  it("retorna lista vazia quando não há sourceGroups", async () => {
    repo.items = [makeLead("l1"), makeLead("l2")];

    const result = await sut.execute("user-1", "sdr");

    expect(result).toEqual([]);
  });

  it("retorna grupos distintos ordenados", async () => {
    repo.items = [
      makeLead("l1", "GrupoB"),
      makeLead("l2", "GrupoA"),
      makeLead("l3", "GrupoB"),
      makeLead("l4", "GrupoC"),
    ];

    const result = await sut.execute("user-1", "sdr");

    expect(result).toEqual(["GrupoA", "GrupoB", "GrupoC"]);
  });

  it("admin obtém todos os grupos", async () => {
    repo.items = [
      makeLead("l1", "GrupoA"),
      makeLead("l2", "GrupoB"),
    ];
    repo.items[1] = Lead.create(
      { ownerId: "user-2", businessName: "Outra" } as Parameters<typeof Lead.create>[0],
      new UniqueEntityID("l2"),
    );
    repo.items[1].update({ sourceGroup: "GrupoB" });

    const result = await sut.execute("admin-1", "admin");

    expect(result).toContain("GrupoA");
    expect(result).toContain("GrupoB");
  });
});
