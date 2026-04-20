import { describe, it, expect, beforeEach } from "vitest";
import {
  GetSectorsUseCase, GetSectorByIdUseCase,
  CreateSectorUseCase, UpdateSectorUseCase, DeleteSectorUseCase,
  LinkSectorToLeadUseCase, UnlinkSectorFromLeadUseCase,
  LinkSectorToOrganizationUseCase, UnlinkSectorFromOrganizationUseCase,
} from "@/domain/sectors/application/use-cases/sectors.use-cases";
import { FakeSectorsRepository } from "../../fakes/fake-sectors.repository";
import { Sector } from "@/domain/sectors/enterprise/entities/sector";
import { SectorName } from "@/domain/sectors/enterprise/value-objects/sector-name.vo";
import { SectorSlug } from "@/domain/sectors/enterprise/value-objects/sector-slug.vo";
import { UniqueEntityID } from "@/core/unique-entity-id";

let repo: FakeSectorsRepository;

function seed(id: string, name: string, slug: string, ownerId: string): Sector {
  const s = Sector.create(
    {
      name: SectorName.create(name).unwrap(),
      slug: SectorSlug.create(slug).unwrap(),
      isActive: true,
      ownerId,
    },
    new UniqueEntityID(id),
  );
  repo.items.push(s);
  return s;
}

beforeEach(() => { repo = new FakeSectorsRepository(); });

describe("GetSectorsUseCase", () => {
  it("returns sectors for owner", async () => {
    seed("s1", "Tech", "tech", "user-001");
    seed("s2", "Saúde", "saude", "user-001");
    seed("s3", "Outro", "outro", "user-002");
    const { sectors } = (await new GetSectorsUseCase(repo).execute("user-001")).unwrap();
    expect(sectors).toHaveLength(2);
  });
});

describe("GetSectorByIdUseCase", () => {
  it("returns sector for owner", async () => {
    seed("s1", "Tech", "tech", "user-001");
    const { sector } = (await new GetSectorByIdUseCase(repo).execute("s1", "user-001")).unwrap();
    expect(sector.name).toBe("Tech");
  });

  it("returns SectorNotFoundError for wrong owner", async () => {
    seed("s1", "Tech", "tech", "user-001");
    const result = await new GetSectorByIdUseCase(repo).execute("s1", "user-999");
    expect(result.isLeft()).toBe(true);
  });
});

describe("CreateSectorUseCase", () => {
  it("creates sector with auto-generated slug", async () => {
    const { sector } = (await new CreateSectorUseCase(repo).execute({
      name: "Tecnologia SaaS", ownerId: "user-001",
    })).unwrap();
    expect(sector.slug).toBe("tecnologia-saas");
    expect(repo.items).toHaveLength(1);
  });

  it("creates sector with explicit slug", async () => {
    const { sector } = (await new CreateSectorUseCase(repo).execute({
      name: "Tech", slug: "tech-br", ownerId: "user-001",
    })).unwrap();
    expect(sector.slug).toBe("tech-br");
  });

  it("returns error for empty name", async () => {
    expect((await new CreateSectorUseCase(repo).execute({ name: "", ownerId: "u1" })).isLeft()).toBe(true);
  });

  it("returns DuplicateSectorError for same slug and owner", async () => {
    seed("s1", "Tech", "tech", "user-001");
    const result = await new CreateSectorUseCase(repo).execute({ name: "Tech", ownerId: "user-001" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("DuplicateSectorError");
  });
});

describe("UpdateSectorUseCase", () => {
  it("updates name and regenerates slug if name changed", async () => {
    seed("s1", "Tech", "tech", "user-001");
    const { sector } = (await new UpdateSectorUseCase(repo).execute({
      id: "s1", name: "Saúde", slug: "saude", requesterId: "user-001",
    })).unwrap();
    expect(sector.name).toBe("Saúde");
    expect(sector.slug).toBe("saude");
  });

  it("returns SectorNotFoundError for unknown id", async () => {
    const result = await new UpdateSectorUseCase(repo).execute({ id: "x", requesterId: "user-001" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("SectorNotFoundError");
  });
});

describe("DeleteSectorUseCase", () => {
  it("deletes existing sector", async () => {
    seed("s1", "Tech", "tech", "user-001");
    expect((await new DeleteSectorUseCase(repo).execute("s1", "user-001")).isRight()).toBe(true);
    expect(repo.items).toHaveLength(0);
  });

  it("returns error when not owner", async () => {
    seed("s1", "Tech", "tech", "user-001");
    expect((await new DeleteSectorUseCase(repo).execute("s1", "user-999")).isLeft()).toBe(true);
  });
});

describe("Link use cases", () => {
  it("links sector to lead", async () => {
    seed("s1", "Tech", "tech", "user-001");
    await new LinkSectorToLeadUseCase(repo).execute({ sectorId: "s1", entityId: "lead-001", requesterId: "user-001" });
    expect(repo.leadLinks.get("lead-001")?.has("s1")).toBe(true);
  });

  it("unlinks sector from lead", async () => {
    seed("s1", "Tech", "tech", "user-001");
    await repo.addToLead("s1", "lead-001");
    await new UnlinkSectorFromLeadUseCase(repo).execute({ sectorId: "s1", entityId: "lead-001", requesterId: "user-001" });
    expect(repo.leadLinks.get("lead-001")?.has("s1")).toBe(false);
  });

  it("links sector to organization", async () => {
    seed("s1", "Tech", "tech", "user-001");
    await new LinkSectorToOrganizationUseCase(repo).execute({ sectorId: "s1", entityId: "org-001", requesterId: "user-001" });
    expect(repo.orgLinks.get("org-001")?.has("s1")).toBe(true);
  });

  it("returns SectorForbiddenError when linking another owner's sector", async () => {
    seed("s1", "Tech", "tech", "user-001");
    const result = await new LinkSectorToLeadUseCase(repo).execute({ sectorId: "s1", entityId: "lead-001", requesterId: "user-999" });
    expect(result.isLeft()).toBe(true);
    expect((result.value as Error).name).toBe("SectorForbiddenError");
  });
});
