import { describe, it, expect, beforeEach } from "vitest";
import { CheckLeadDuplicatesUseCase } from "@/domain/lead-duplicates/application/use-cases/check-lead-duplicates.use-case";
import { FakeLeadDuplicatesRepository } from "../../fakes/fake-lead-duplicates.repository";

let repo: FakeLeadDuplicatesRepository;
let useCase: CheckLeadDuplicatesUseCase;

beforeEach(() => {
  repo = new FakeLeadDuplicatesRepository();
  useCase = new CheckLeadDuplicatesUseCase(repo);
  repo.leads = [
    { id: "l1", businessName: "Acme Tech Ltda", ownerId: "user-001", cnpj: "12.345.678/0001-99", phone: "11999990000", email: "acme@acme.com", address: "Rua das Flores, 123" },
    { id: "l2", businessName: "Beta Solutions", ownerId: "user-001", cnpj: "98.765.432/0001-11", phone: "11888880000", email: "beta@beta.com" },
    { id: "l3", businessName: "Gamma Corp", ownerId: "user-002", cnpj: "12.345.678/0001-99" }, // different owner
  ];
});

describe("CheckLeadDuplicatesUseCase", () => {
  it("finds duplicate by CNPJ", async () => {
    const { duplicates, hasDuplicates } = (await useCase.execute({ ownerId: "user-001", cnpj: "12.345.678/0001-99" })).unwrap();
    expect(hasDuplicates).toBe(true);
    expect(duplicates[0].leadId).toBe("l1");
    expect(duplicates[0].matchedFields).toContain("cnpj");
  });

  it("finds duplicate by email (case-insensitive)", async () => {
    const { duplicates } = (await useCase.execute({ ownerId: "user-001", email: "ACME@ACME.COM" })).unwrap();
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].matchedFields).toContain("email");
  });

  it("finds duplicate by phone", async () => {
    const { duplicates } = (await useCase.execute({ ownerId: "user-001", phone: "11999990000" })).unwrap();
    expect(duplicates[0].matchedFields).toContain("phone");
  });

  it("finds duplicate by partial name", async () => {
    const { duplicates } = (await useCase.execute({ ownerId: "user-001", name: "Acme" })).unwrap();
    expect(duplicates[0].matchedFields).toContain("name");
  });

  it("does not return duplicates from other users", async () => {
    const { duplicates } = (await useCase.execute({ ownerId: "user-001", cnpj: "12.345.678/0001-99" })).unwrap();
    expect(duplicates.every((d) => d.leadId !== "l3")).toBe(true);
  });

  it("returns higher score for more matched fields", async () => {
    const { duplicates } = (await useCase.execute({ ownerId: "user-001", cnpj: "12.345.678/0001-99", phone: "11999990000", email: "acme@acme.com" })).unwrap();
    expect(duplicates[0].score).toBeGreaterThan(25);
  });

  it("returns no duplicates when nothing matches", async () => {
    const { duplicates, hasDuplicates } = (await useCase.execute({ ownerId: "user-001", cnpj: "00.000.000/0001-00" })).unwrap();
    expect(hasDuplicates).toBe(false);
    expect(duplicates).toHaveLength(0);
  });

  it("returns NoCriteriaError when no criteria provided", async () => {
    const result = await useCase.execute({ ownerId: "user-001" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("NoCriteriaError");
  });

  it("finds duplicate when input name contains the existing name (reverse substring match)", async () => {
    // Existing lead: "teste" — new lead: "teste para telefonar e reuniao"
    repo.leads = [
      { id: "l-short", businessName: "teste", ownerId: "user-001" },
    ];
    const { duplicates, hasDuplicates } = (await useCase.execute({ ownerId: "user-001", name: "teste para telefonar e reuniao" })).unwrap();
    expect(hasDuplicates).toBe(true);
    expect(duplicates[0].leadId).toBe("l-short");
    expect(duplicates[0].matchedFields).toContain("name");
  });

  it("finds duplicate when existing name is a leading word of the input name", async () => {
    repo.leads = [
      { id: "l-acme", businessName: "Acme", ownerId: "user-001" },
    ];
    const { duplicates } = (await useCase.execute({ ownerId: "user-001", name: "Acme Tech Solutions" })).unwrap();
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].matchedFields).toContain("name");
  });
});
