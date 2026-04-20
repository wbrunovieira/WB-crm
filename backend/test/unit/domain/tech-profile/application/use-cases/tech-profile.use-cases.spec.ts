import { describe, it, expect, beforeEach } from "vitest";
import {
  GetTechProfileItemsUseCase, GetLeadTechProfileUseCase,
  AddLeadTechProfileItemUseCase, RemoveLeadTechProfileItemUseCase,
  GetOrganizationTechProfileUseCase, AddOrganizationTechProfileItemUseCase, RemoveOrganizationTechProfileItemUseCase,
} from "@/domain/tech-profile/application/use-cases/tech-profile.use-cases";
import { FakeTechProfileRepository } from "../../fakes/fake-tech-profile.repository";

let repo: FakeTechProfileRepository;

beforeEach(() => {
  repo = new FakeTechProfileRepository();
  repo.seedItem("language", { id: "lang-1", name: "JavaScript", slug: "javascript" });
  repo.seedItem("language", { id: "lang-2", name: "Python", slug: "python" });
  repo.seedItem("framework", { id: "fw-1", name: "React", slug: "react" });
  repo.seedItem("erp", { id: "erp-1", name: "SAP", slug: "sap" });
});

describe("GetTechProfileItemsUseCase", () => {
  it("returns items for valid type", async () => {
    const { items } = (await new GetTechProfileItemsUseCase(repo).execute("language")).unwrap();
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("JavaScript");
  });

  it("returns error for invalid type", async () => {
    const result = await new GetTechProfileItemsUseCase(repo).execute("unknown");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("InvalidTechProfileTypeError");
  });
});

describe("Lead tech profile", () => {
  it("gets empty profile for new lead", async () => {
    const { profile } = (await new GetLeadTechProfileUseCase(repo).execute("lead-001")).unwrap();
    expect(profile.languages).toHaveLength(0);
    expect(profile.frameworks).toHaveLength(0);
  });

  it("adds language to lead", async () => {
    await new AddLeadTechProfileItemUseCase(repo).execute("lead-001", "language", "lang-1");
    const { profile } = (await new GetLeadTechProfileUseCase(repo).execute("lead-001")).unwrap();
    expect(profile.languages).toHaveLength(1);
    expect(profile.languages[0].name).toBe("JavaScript");
  });

  it("adds multiple types to lead", async () => {
    await new AddLeadTechProfileItemUseCase(repo).execute("lead-001", "language", "lang-1");
    await new AddLeadTechProfileItemUseCase(repo).execute("lead-001", "framework", "fw-1");
    await new AddLeadTechProfileItemUseCase(repo).execute("lead-001", "erp", "erp-1");
    const { profile } = (await new GetLeadTechProfileUseCase(repo).execute("lead-001")).unwrap();
    expect(profile.languages).toHaveLength(1);
    expect(profile.frameworks).toHaveLength(1);
    expect(profile.erps).toHaveLength(1);
  });

  it("removes language from lead", async () => {
    await repo.addToLead("lead-001", "language", "lang-1");
    await new RemoveLeadTechProfileItemUseCase(repo).execute("lead-001", "language", "lang-1");
    const { profile } = (await new GetLeadTechProfileUseCase(repo).execute("lead-001")).unwrap();
    expect(profile.languages).toHaveLength(0);
  });

  it("returns error for invalid type when adding", async () => {
    const result = await new AddLeadTechProfileItemUseCase(repo).execute("lead-001", "bad-type", "x");
    expect(result.isLeft()).toBe(true);
  });
});

describe("Organization tech profile", () => {
  it("adds language to organization", async () => {
    await new AddOrganizationTechProfileItemUseCase(repo).execute("org-001", "language", "lang-1");
    const { profile } = (await new GetOrganizationTechProfileUseCase(repo).execute("org-001")).unwrap();
    expect(profile.languages).toHaveLength(1);
  });

  it("removes framework from organization", async () => {
    await repo.addToOrganization("org-001", "framework", "fw-1");
    await new RemoveOrganizationTechProfileItemUseCase(repo).execute("org-001", "framework", "fw-1");
    const { profile } = (await new GetOrganizationTechProfileUseCase(repo).execute("org-001")).unwrap();
    expect(profile.frameworks).toHaveLength(0);
  });
});
