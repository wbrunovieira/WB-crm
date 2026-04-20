import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLeadImportRepository } from "../../fakes/in-memory-lead-import.repository";
import { ImportLeadsUseCase } from "@/domain/lead-import/application/use-cases/import-leads.use-case";

let repo: InMemoryLeadImportRepository;
let uc: ImportLeadsUseCase;

beforeEach(() => {
  repo = new InMemoryLeadImportRepository();
  uc = new ImportLeadsUseCase(repo);
});

const base = { ownerId: "u1" };

describe("ImportLeadsUseCase", () => {
  it("imports empty batch with no changes", async () => {
    const r = (await uc.execute({ rows: [], ...base })).unwrap();
    expect(r.total).toBe(0);
    expect(r.imported).toBe(0);
  });

  it("imports a single valid lead", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "Empresa Alpha", city: "SP", source: "manual" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(0);
    expect(r.errors).toHaveLength(0);
    expect(repo.leads).toHaveLength(1);
    expect(repo.leads[0].businessName).toBe("Empresa Alpha");
    expect(repo.leads[0].source).toBe("manual");
  });

  it("defaults source to 'import'", async () => {
    await uc.execute({ rows: [{ businessName: "Empresa Beta" }], ...base });
    expect(repo.leads[0].source).toBe("import");
  });

  it("imports multiple leads in batch", async () => {
    const r = (await uc.execute({
      rows: [
        { businessName: "A" },
        { businessName: "B" },
        { businessName: "C" },
      ],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(3);
    expect(repo.leads).toHaveLength(3);
  });

  it("skips lead with same businessName (existing in DB)", async () => {
    await uc.execute({ rows: [{ businessName: "Duplicada" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "Duplicada" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
    expect(r.imported).toBe(0);
    expect(repo.leads).toHaveLength(1);
  });

  it("deduplicates by name case-insensitively", async () => {
    await uc.execute({ rows: [{ businessName: "Empresa XYZ" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "EMPRESA XYZ" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
  });

  it("skips lead with same CNPJ", async () => {
    await uc.execute({
      rows: [{ businessName: "A", companyRegistrationID: "12345" }],
      ...base,
    });
    const r = (await uc.execute({
      rows: [{ businessName: "Different Name", companyRegistrationID: "12345" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
  });

  it("deduplicates intra-batch by name", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "Unica" }, { businessName: "Unica" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(1);
  });

  it("tracks error rows for invalid leads", async () => {
    const r = (await uc.execute({
      rows: [
        { businessName: "Valida" },
        { businessName: "" },
      ],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].row).toBe(2);
  });

  it("mixes imports, skips and errors correctly", async () => {
    await uc.execute({ rows: [{ businessName: "Existente" }], ...base });

    const r = (await uc.execute({
      rows: [
        { businessName: "Nova" },
        { businessName: "Existente" },
        { businessName: "" },
      ],
      ...base,
    })).unwrap();
    expect(r.total).toBe(3);
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.errors).toHaveLength(1);
  });
});
