import { describe, it, expect, beforeEach } from "vitest";
import {
  GetICPsUseCase, GetICPByIdUseCase, CreateICPUseCase, UpdateICPUseCase, DeleteICPUseCase,
  LinkLeadToICPUseCase, UpdateLeadICPUseCase, UnlinkLeadFromICPUseCase,
  GetLeadICPsUseCase, GetOrganizationICPsUseCase,
  LinkOrganizationToICPUseCase, UpdateOrganizationICPUseCase, UnlinkOrganizationFromICPUseCase,
} from "@/domain/icp/application/use-cases/icp.use-cases";
import { FakeICPRepository } from "../../fakes/fake-icp.repository";
import { ICP } from "@/domain/icp/enterprise/entities/icp";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: FakeICPRepository;

function seed(id: string, name: string, slug: string, ownerId: string): ICP {
  const icp = ICP.create({ name, slug, content: "Test content", ownerId }, new UniqueEntityID(id)).unwrap();
  repo.items.push(icp);
  return icp;
}

beforeEach(() => { repo = new FakeICPRepository(); });

describe("GetICPsUseCase", () => {
  it("returns icps for owner", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    seed("i2", "E-commerce", "ecommerce", "user-001");
    seed("i3", "Other", "other", "user-002");
    const { icps } = (await new GetICPsUseCase(repo).execute("user-001")).unwrap();
    expect(icps).toHaveLength(2);
  });
});

describe("GetICPByIdUseCase", () => {
  it("returns ICP for owner", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const { icp } = (await new GetICPByIdUseCase(repo).execute("i1", "user-001")).unwrap();
    expect(icp.name).toBe("Startup Tech");
  });

  it("returns not found for wrong owner", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const result = await new GetICPByIdUseCase(repo).execute("i1", "user-999");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("ICPForbiddenError");
  });

  it("returns not found for unknown id", async () => {
    const result = await new GetICPByIdUseCase(repo).execute("x", "user-001");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("ICPNotFoundError");
  });
});

describe("CreateICPUseCase", () => {
  it("creates ICP with auto slug", async () => {
    const { icp } = (await new CreateICPUseCase(repo).execute({ name: "Startup de Tech", content: "Desc", ownerId: "user-001" })).unwrap();
    expect(icp.slug).toBe("startup-de-tech");
    expect(repo.items).toHaveLength(1);
  });

  it("creates ICP with explicit slug", async () => {
    const { icp } = (await new CreateICPUseCase(repo).execute({ name: "Test", slug: "custom-slug", content: "Desc", ownerId: "user-001" })).unwrap();
    expect(icp.slug).toBe("custom-slug");
  });

  it("returns DuplicateICPError for same slug and owner", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const result = await new CreateICPUseCase(repo).execute({ name: "Startup Tech", content: "Desc", ownerId: "user-001" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("DuplicateICPError");
  });

  it("allows same slug for different owner", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const result = await new CreateICPUseCase(repo).execute({ name: "Startup Tech", content: "Desc", ownerId: "user-002" });
    expect(result.isRight()).toBe(true);
  });
});

describe("UpdateICPUseCase", () => {
  it("updates ICP", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const { icp } = (await new UpdateICPUseCase(repo).execute({ id: "i1", name: "SaaS Tech", requesterId: "user-001" })).unwrap();
    expect(icp.name).toBe("SaaS Tech");
  });

  it("returns not found for unknown id", async () => {
    const result = await new UpdateICPUseCase(repo).execute({ id: "x", requesterId: "user-001" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("ICPNotFoundError");
  });

  it("returns forbidden for wrong owner", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const result = await new UpdateICPUseCase(repo).execute({ id: "i1", name: "Hack", requesterId: "user-999" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("ICPForbiddenError");
  });
});

describe("DeleteICPUseCase", () => {
  it("deletes existing ICP", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    expect((await new DeleteICPUseCase(repo).execute("i1", "user-001")).isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("returns forbidden when not owner", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const result = await new DeleteICPUseCase(repo).execute("i1", "user-999");
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("ICPForbiddenError");
  });
});

describe("Lead link use cases", () => {
  it("links ICP to lead", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await new LinkLeadToICPUseCase(repo).execute({ icpId: "i1", leadId: "lead-001", requesterId: "user-001", matchScore: 85 });
    expect(repo.leadLinks.get("lead-001")?.has("i1")).toBe(true);
  });

  it("returns forbidden when linking another owner's ICP", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    const result = await new LinkLeadToICPUseCase(repo).execute({ icpId: "i1", leadId: "lead-001", requesterId: "user-999" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("ICPForbiddenError");
  });

  it("updates lead ICP link data", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await repo.linkToLead("i1", "lead-001");
    await new UpdateLeadICPUseCase(repo).execute({ icpId: "i1", leadId: "lead-001", requesterId: "user-001", icpFitStatus: "ideal", matchScore: 90 });
    const links = await repo.getLeadICPs("lead-001");
    expect(links[0].icpFitStatus).toBe("ideal");
    expect(links[0].matchScore).toBe(90);
  });

  it("unlinks ICP from lead", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await repo.linkToLead("i1", "lead-001");
    await new UnlinkLeadFromICPUseCase(repo).execute("i1", "lead-001", "user-001");
    expect(repo.leadLinks.get("lead-001")?.has("i1")).toBe(false);
  });

  it("gets lead ICPs", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await repo.linkToLead("i1", "lead-001", { matchScore: 75 });
    const { links } = (await new GetLeadICPsUseCase(repo).execute("lead-001")).unwrap();
    expect(links).toHaveLength(1);
    expect(links[0].matchScore).toBe(75);
  });
});

describe("Organization link use cases", () => {
  it("links ICP to organization", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await new LinkOrganizationToICPUseCase(repo).execute({ icpId: "i1", organizationId: "org-001", requesterId: "user-001" });
    expect(repo.orgLinks.get("org-001")?.has("i1")).toBe(true);
  });

  it("updates organization ICP link data", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await repo.linkToOrganization("i1", "org-001");
    await new UpdateOrganizationICPUseCase(repo).execute({ icpId: "i1", organizationId: "org-001", requesterId: "user-001", icpFitStatus: "partial" });
    const links = await repo.getOrganizationICPs("org-001");
    expect(links[0].icpFitStatus).toBe("partial");
  });

  it("unlinks ICP from organization", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await repo.linkToOrganization("i1", "org-001");
    await new UnlinkOrganizationFromICPUseCase(repo).execute("i1", "org-001", "user-001");
    expect(repo.orgLinks.get("org-001")?.has("i1")).toBe(false);
  });

  it("gets organization ICPs", async () => {
    seed("i1", "Startup Tech", "startup-tech", "user-001");
    await repo.linkToOrganization("i1", "org-001", { matchScore: 60 });
    const { links } = (await new GetOrganizationICPsUseCase(repo).execute("org-001")).unwrap();
    expect(links).toHaveLength(1);
    expect(links[0].matchScore).toBe(60);
  });
});
