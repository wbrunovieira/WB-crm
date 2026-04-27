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

  it("populates skippedDetails with reason 'name' when name already exists", async () => {
    await uc.execute({ rows: [{ businessName: "Empresa Existente" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "Empresa Existente" }],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].reason).toBe("name");
    expect(r.skippedDetails[0].businessName).toBe("Empresa Existente");
  });

  it("populates skippedDetails with reason 'cnpj' when cnpj already exists", async () => {
    await uc.execute({
      rows: [{ businessName: "Original", companyRegistrationID: "99999" }],
      ...base,
    });

    const r = (await uc.execute({
      rows: [{ businessName: "Outro Nome", companyRegistrationID: "99999" }],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].reason).toBe("cnpj");
    expect(r.skippedDetails[0].businessName).toBe("Outro Nome");
  });

  it("does not skip when skipDuplicates is true", async () => {
    await uc.execute({ rows: [{ businessName: "Duplicada" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "Duplicada" }],
      ...base,
      skipDuplicates: true,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(0);
    expect(r.skippedDetails).toHaveLength(0);
  });

  it("uses registeredName as businessName when businessName is empty", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "", registeredName: "EMPRESA LTDA" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.errors).toHaveLength(0);
    expect(repo.leads[0].businessName).toBe("EMPRESA LTDA");
    expect(repo.leads[0].registeredName).toBe("EMPRESA LTDA");
  });

  it("deduplicates by registeredName fallback when businessName is empty", async () => {
    await uc.execute({ rows: [{ businessName: "", registeredName: "EMPRESA LTDA" }], ...base });

    const r = (await uc.execute({
      rows: [{ businessName: "", registeredName: "EMPRESA LTDA" }],
      ...base,
    })).unwrap();
    expect(r.skipped).toBe(1);
    expect(r.imported).toBe(0);
  });

  it("errors when both businessName and registeredName are empty", async () => {
    const r = (await uc.execute({
      rows: [{ businessName: "", registeredName: "" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(0);
    expect(r.errors).toHaveLength(1);
  });

  it("skippedDetails rowIndex is 0-based index in input rows array", async () => {
    await uc.execute({ rows: [{ businessName: "Ja Existe" }], ...base });

    const r = (await uc.execute({
      rows: [
        { businessName: "Nova A" },
        { businessName: "Nova B" },
        { businessName: "Ja Existe" },
      ],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].rowIndex).toBe(2);
  });

  it("skippedDetails includes existingLeadId when lead already exists in DB", async () => {
    // First import creates a lead with a known ID
    await uc.execute({ rows: [{ businessName: "Empresa DB" }], ...base });
    const existingLead = repo.leads.find(l => l.businessName === "Empresa DB")!;
    expect(existingLead).toBeDefined();

    // Second import should skip with existingLeadId populated
    const r = (await uc.execute({
      rows: [{ businessName: "Empresa DB" }],
      ...base,
    })).unwrap();
    expect(r.skippedDetails).toHaveLength(1);
    expect(r.skippedDetails[0].existingLeadId).toBe(existingLead.id.toString());
  });

  it("skippedDetails existingLeadId is empty string for intra-batch duplicates", async () => {
    // No pre-existing leads — both rows are new in this batch
    const r = (await uc.execute({
      rows: [{ businessName: "Intra Batch" }, { businessName: "Intra Batch" }],
      ...base,
    })).unwrap();
    expect(r.imported).toBe(1);
    expect(r.skipped).toBe(1);
    expect(r.skippedDetails[0].existingLeadId).toBe("");
  });
});
