import { describe, it, expect, beforeEach } from "vitest";
import {
  SearchCnaesUseCase,
  GetCnaeByIdUseCase,
  AddSecondaryCnaeToLeadUseCase,
  RemoveSecondaryCnaeFromLeadUseCase,
  AddSecondaryCnaeToOrganizationUseCase,
  RemoveSecondaryCnaeFromOrganizationUseCase,
} from "@/domain/cnae/application/use-cases/cnae.use-cases";
import { FakeCnaeRepository } from "../../fakes/fake-cnae.repository";

const SEED = [
  { id: "cnae-001", code: "0111-3/01", description: "Cultivo de arroz" },
  { id: "cnae-002", code: "4711-3/01", description: "Comércio varejista de mercadorias" },
  { id: "cnae-003", code: "6201-5/00", description: "Desenvolvimento de programas de computador" },
];

let repo: FakeCnaeRepository;

beforeEach(() => {
  repo = new FakeCnaeRepository();
  repo.seed(SEED);
});

describe("SearchCnaesUseCase", () => {
  it("returns results matching code", async () => {
    const result = await new SearchCnaesUseCase(repo).execute("0111");
    expect(result.isRight()).toBe(true);
    expect(result.value.cnaes).toHaveLength(1);
    expect(result.value.cnaes[0].code).toBe("0111-3/01");
  });

  it("returns results matching description (case insensitive)", async () => {
    const result = await new SearchCnaesUseCase(repo).execute("programas");
    expect(result.value.cnaes).toHaveLength(1);
    expect(result.value.cnaes[0].id).toBe("cnae-003");
  });

  it("trims query whitespace", async () => {
    const result = await new SearchCnaesUseCase(repo).execute("  arroz  ");
    expect(result.value.cnaes).toHaveLength(1);
  });

  it("returns empty when no match", async () => {
    const result = await new SearchCnaesUseCase(repo).execute("xyz-inexistente");
    expect(result.value.cnaes).toHaveLength(0);
  });
});

describe("GetCnaeByIdUseCase", () => {
  it("returns cnae by id", async () => {
    const result = await new GetCnaeByIdUseCase(repo).execute("cnae-001");
    expect(result.unwrap().cnae.code).toBe("0111-3/01");
  });

  it("returns CnaeNotFoundError for unknown id", async () => {
    const result = await new GetCnaeByIdUseCase(repo).execute("unknown");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("CnaeNotFoundError");
  });
});

describe("AddSecondaryCnaeToLeadUseCase", () => {
  it("links cnae to lead", async () => {
    const result = await new AddSecondaryCnaeToLeadUseCase(repo).execute({
      cnaeId: "cnae-001", entityId: "lead-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.leadLinks.get("lead-001")?.has("cnae-001")).toBe(true);
  });

  it("returns error for unknown cnae", async () => {
    const result = await new AddSecondaryCnaeToLeadUseCase(repo).execute({
      cnaeId: "unknown", entityId: "lead-001",
    });
    expect(result.isLeft()).toBe(true);
  });
});

describe("RemoveSecondaryCnaeFromLeadUseCase", () => {
  it("removes cnae from lead", async () => {
    await repo.addToLead("cnae-001", "lead-001");
    const result = await new RemoveSecondaryCnaeFromLeadUseCase(repo).execute({
      cnaeId: "cnae-001", entityId: "lead-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.leadLinks.get("lead-001")?.has("cnae-001")).toBe(false);
  });
});

describe("AddSecondaryCnaeToOrganizationUseCase", () => {
  it("links cnae to organization", async () => {
    const result = await new AddSecondaryCnaeToOrganizationUseCase(repo).execute({
      cnaeId: "cnae-002", entityId: "org-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.orgLinks.get("org-001")?.has("cnae-002")).toBe(true);
  });
});

describe("RemoveSecondaryCnaeFromOrganizationUseCase", () => {
  it("removes cnae from organization", async () => {
    await repo.addToOrganization("cnae-002", "org-001");
    const result = await new RemoveSecondaryCnaeFromOrganizationUseCase(repo).execute({
      cnaeId: "cnae-002", entityId: "org-001",
    });
    expect(result.isRight()).toBe(true);
    expect(repo.orgLinks.get("org-001")?.has("cnae-002")).toBe(false);
  });
});
