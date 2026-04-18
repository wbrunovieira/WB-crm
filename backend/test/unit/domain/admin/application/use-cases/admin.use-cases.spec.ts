import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryAdminRepository } from "../../repositories/in-memory-admin.repository";

import {
  ListBusinessLinesUseCase,
  CreateBusinessLineUseCase,
  UpdateBusinessLineUseCase,
  DeleteBusinessLineUseCase,
  ToggleBusinessLineUseCase,
} from "@/domain/admin/application/use-cases/business-line.use-cases";

import {
  ListProductsUseCase,
  CreateProductUseCase,
  UpdateProductUseCase,
  DeleteProductUseCase,
  ToggleProductUseCase,
} from "@/domain/admin/application/use-cases/product.use-cases";

import {
  ListTechOptionsUseCase,
  CreateTechOptionUseCase,
  UpdateTechOptionUseCase,
  DeleteTechOptionUseCase,
  ToggleTechOptionUseCase,
} from "@/domain/admin/application/use-cases/tech-option.use-cases";

let repo: InMemoryAdminRepository;

beforeEach(() => {
  repo = new InMemoryAdminRepository();
});

// ─── BusinessLine ─────────────────────────────────────────────────────────────

describe("BusinessLine use cases", () => {
  describe("ListBusinessLinesUseCase", () => {
    it("retorna lista vazia inicialmente", async () => {
      const uc = new ListBusinessLinesUseCase(repo);
      const result = await uc.execute();
      expect(result.isRight()).toBe(true);
      expect(result.value).toMatchObject({ items: [] });
    });

    it("retorna linhas criadas", async () => {
      const create = new CreateBusinessLineUseCase(repo);
      await create.execute({ name: "Dev Web", slug: "dev-web", isActive: true, order: 1 });
      const list = new ListBusinessLinesUseCase(repo);
      const result = await list.execute();
      expect(result.value).toMatchObject({ items: expect.arrayContaining([expect.objectContaining({ name: "Dev Web" })]) });
    });
  });

  describe("CreateBusinessLineUseCase", () => {
    it("cria linha com dados válidos", async () => {
      const uc = new CreateBusinessLineUseCase(repo);
      const result = await uc.execute({ name: "Automação", slug: "automacao", color: "#FF0000", order: 2, isActive: true });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.item.name).toBe("Automação");
        expect(result.value.item.slug).toBe("automacao");
        expect(result.value.item.color).toBe("#FF0000");
        expect(result.value.item.isActive).toBe(true);
      }
    });

    it("retorna erro se nome vazio", async () => {
      const uc = new CreateBusinessLineUseCase(repo);
      const result = await uc.execute({ name: "  ", slug: "x", isActive: true, order: 0 });
      expect(result.isLeft()).toBe(true);
    });

    it("retorna erro se slug vazio", async () => {
      const uc = new CreateBusinessLineUseCase(repo);
      const result = await uc.execute({ name: "Válido", slug: "", isActive: true, order: 0 });
      expect(result.isLeft()).toBe(true);
    });

    it("persiste no repositório", async () => {
      const uc = new CreateBusinessLineUseCase(repo);
      await uc.execute({ name: "IA", slug: "ia", isActive: true, order: 0 });
      expect(repo.businessLines).toHaveLength(1);
      expect(repo.businessLines[0].name).toBe("IA");
    });
  });

  describe("UpdateBusinessLineUseCase", () => {
    it("atualiza dados existentes", async () => {
      const create = new CreateBusinessLineUseCase(repo);
      const created = await create.execute({ name: "Antigo", slug: "antigo", isActive: true, order: 0 });
      if (created.isLeft()) throw created.value;
      const id = created.value.item.id.toString();

      const uc = new UpdateBusinessLineUseCase(repo);
      const result = await uc.execute({ id, name: "Novo Nome", slug: "novo-nome" });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.item.name).toBe("Novo Nome");
    });

    it("retorna erro para id inexistente", async () => {
      const uc = new UpdateBusinessLineUseCase(repo);
      const result = await uc.execute({ id: "nao-existe" });
      expect(result.isLeft()).toBe(true);
      expect(result.value).toMatchObject({ message: expect.stringContaining("não encontrada") });
    });
  });

  describe("DeleteBusinessLineUseCase", () => {
    it("remove item existente", async () => {
      const create = new CreateBusinessLineUseCase(repo);
      const created = await create.execute({ name: "Para Deletar", slug: "para-deletar", isActive: true, order: 0 });
      if (created.isLeft()) throw created.value;
      const id = created.value.item.id.toString();

      const uc = new DeleteBusinessLineUseCase(repo);
      const result = await uc.execute(id);
      expect(result.isRight()).toBe(true);
      expect(repo.businessLines).toHaveLength(0);
    });

    it("retorna erro para id inexistente", async () => {
      const uc = new DeleteBusinessLineUseCase(repo);
      const result = await uc.execute("nao-existe");
      expect(result.isLeft()).toBe(true);
    });
  });

  describe("ToggleBusinessLineUseCase", () => {
    it("inverte isActive de true para false", async () => {
      const create = new CreateBusinessLineUseCase(repo);
      const created = await create.execute({ name: "Toggle", slug: "toggle", isActive: true, order: 0 });
      if (created.isLeft()) throw created.value;
      const id = created.value.item.id.toString();

      const uc = new ToggleBusinessLineUseCase(repo);
      const result = await uc.execute(id);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.item.isActive).toBe(false);
    });

    it("inverte isActive de false para true", async () => {
      const create = new CreateBusinessLineUseCase(repo);
      const created = await create.execute({ name: "Inativo", slug: "inativo", isActive: false, order: 0 });
      if (created.isLeft()) throw created.value;
      const id = created.value.item.id.toString();

      const uc = new ToggleBusinessLineUseCase(repo);
      const result = await uc.execute(id);
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.item.isActive).toBe(true);
    });
  });
});

// ─── Product ──────────────────────────────────────────────────────────────────

describe("Product use cases", () => {
  const BL_ID = "bl-001";

  describe("CreateProductUseCase", () => {
    it("cria produto com dados válidos", async () => {
      const uc = new CreateProductUseCase(repo);
      const result = await uc.execute({ name: "E-commerce", slug: "ecommerce", businessLineId: BL_ID, isActive: true, order: 0 });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.item.name).toBe("E-commerce");
        expect(result.value.item.businessLineId).toBe(BL_ID);
        expect(result.value.item.currency).toBe("BRL");
      }
    });

    it("retorna erro se nome vazio", async () => {
      const uc = new CreateProductUseCase(repo);
      const result = await uc.execute({ name: "", slug: "x", businessLineId: BL_ID, isActive: true, order: 0 });
      expect(result.isLeft()).toBe(true);
    });

    it("retorna erro se businessLineId ausente", async () => {
      const uc = new CreateProductUseCase(repo);
      const result = await uc.execute({ name: "X", slug: "x", businessLineId: "", isActive: true, order: 0 });
      expect(result.isLeft()).toBe(true);
    });

    it("persiste produto com preço e tipo de precificação", async () => {
      const uc = new CreateProductUseCase(repo);
      await uc.execute({ name: "App", slug: "app", businessLineId: BL_ID, basePrice: 5000, pricingType: "fixed", isActive: true, order: 0 });
      expect(repo.products[0].basePrice).toBe(5000);
      expect(repo.products[0].pricingType).toBe("fixed");
    });
  });

  describe("ListProductsUseCase", () => {
    it("filtra por businessLineId", async () => {
      const create = new CreateProductUseCase(repo);
      await create.execute({ name: "P1", slug: "p1", businessLineId: "bl-A", isActive: true, order: 0 });
      await create.execute({ name: "P2", slug: "p2", businessLineId: "bl-B", isActive: true, order: 0 });

      const list = new ListProductsUseCase(repo);
      const result = await list.execute("bl-A");
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].name).toBe("P1");
      }
    });

    it("retorna todos se businessLineId não fornecido", async () => {
      const create = new CreateProductUseCase(repo);
      await create.execute({ name: "P1", slug: "p1", businessLineId: "bl-A", isActive: true, order: 0 });
      await create.execute({ name: "P2", slug: "p2", businessLineId: "bl-B", isActive: true, order: 0 });

      const list = new ListProductsUseCase(repo);
      const result = await list.execute();
      if (result.isRight()) expect(result.value.items).toHaveLength(2);
    });
  });

  describe("UpdateProductUseCase", () => {
    it("atualiza produto", async () => {
      const create = new CreateProductUseCase(repo);
      const created = await create.execute({ name: "Old", slug: "old", businessLineId: BL_ID, isActive: true, order: 0 });
      if (created.isLeft()) throw created.value;
      const id = created.value.item.id.toString();

      const uc = new UpdateProductUseCase(repo);
      const result = await uc.execute({ id, name: "New", slug: "new", basePrice: 1000 });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.item.name).toBe("New");
        expect(result.value.item.basePrice).toBe(1000);
      }
    });
  });

  describe("DeleteProductUseCase", () => {
    it("remove produto", async () => {
      const create = new CreateProductUseCase(repo);
      const created = await create.execute({ name: "Del", slug: "del", businessLineId: BL_ID, isActive: true, order: 0 });
      if (created.isLeft()) throw created.value;

      const uc = new DeleteProductUseCase(repo);
      await uc.execute(created.value.item.id.toString());
      expect(repo.products).toHaveLength(0);
    });
  });

  describe("ToggleProductUseCase", () => {
    it("inverte isActive", async () => {
      const create = new CreateProductUseCase(repo);
      const created = await create.execute({ name: "T", slug: "t", businessLineId: BL_ID, isActive: true, order: 0 });
      if (created.isLeft()) throw created.value;

      const uc = new ToggleProductUseCase(repo);
      const result = await uc.execute(created.value.item.id.toString());
      if (result.isRight()) expect(result.value.item.isActive).toBe(false);
    });
  });
});

// ─── TechOption ───────────────────────────────────────────────────────────────

describe("TechOption use cases", () => {
  describe("CreateTechOptionUseCase — tech-category", () => {
    it("cria categoria com dados válidos", async () => {
      const uc = new CreateTechOptionUseCase(repo);
      const result = await uc.execute({ type: "tech-category", name: "Frontend", slug: "frontend", isActive: true });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.item.name).toBe("Frontend");
        expect(result.value.item.entityType).toBe("tech-category");
        expect(result.value.item.isActive).toBe(true);
      }
    });

    it("retorna erro se nome vazio", async () => {
      const uc = new CreateTechOptionUseCase(repo);
      const result = await uc.execute({ type: "tech-category", name: "", slug: "x", isActive: true });
      expect(result.isLeft()).toBe(true);
    });

    it("persiste no store correto", async () => {
      const uc = new CreateTechOptionUseCase(repo);
      await uc.execute({ type: "tech-language", name: "Python", slug: "python", isActive: true });
      expect(repo.techOptions.get("tech-language")).toHaveLength(1);
      expect(repo.techOptions.get("tech-category")).toBeUndefined();
    });
  });

  describe("CreateTechOptionUseCase — tech-framework (com languageSlug)", () => {
    it("cria framework com languageSlug", async () => {
      const uc = new CreateTechOptionUseCase(repo);
      const result = await uc.execute({ type: "tech-framework", name: "React", slug: "react", languageSlug: "javascript", isActive: true });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.item.languageSlug).toBe("javascript");
    });
  });

  describe("CreateTechOptionUseCase — profile-hosting (com subType)", () => {
    it("cria hosting com subType", async () => {
      const uc = new CreateTechOptionUseCase(repo);
      const result = await uc.execute({ type: "profile-hosting", name: "AWS", slug: "aws", subType: "cloud", isActive: true });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.item.subType).toBe("cloud");
    });
  });

  describe("ListTechOptionsUseCase", () => {
    it("retorna apenas opções do tipo solicitado", async () => {
      const create = new CreateTechOptionUseCase(repo);
      await create.execute({ type: "tech-language", name: "JS", slug: "js", isActive: true });
      await create.execute({ type: "tech-category", name: "Backend", slug: "backend", isActive: true });

      const list = new ListTechOptionsUseCase(repo);
      const result = await list.execute("tech-language");
      expect(result.isRight()).toBe(true);
      if (result.isRight()) {
        expect(result.value.items).toHaveLength(1);
        expect(result.value.items[0].entityType).toBe("tech-language");
      }
    });
  });

  describe("UpdateTechOptionUseCase", () => {
    it("atualiza nome e slug", async () => {
      const create = new CreateTechOptionUseCase(repo);
      const created = await create.execute({ type: "tech-category", name: "Old", slug: "old", isActive: true });
      if (created.isLeft()) throw created.value;
      const id = created.value.item.id.toString();

      const uc = new UpdateTechOptionUseCase(repo);
      const result = await uc.execute({ type: "tech-category", id, name: "Novo", slug: "novo" });
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.item.name).toBe("Novo");
    });

    it("retorna erro para id inexistente", async () => {
      const uc = new UpdateTechOptionUseCase(repo);
      const result = await uc.execute({ type: "tech-language", id: "nao-existe" });
      expect(result.isLeft()).toBe(true);
    });
  });

  describe("DeleteTechOptionUseCase", () => {
    it("remove opção do store", async () => {
      const create = new CreateTechOptionUseCase(repo);
      const created = await create.execute({ type: "profile-erp", name: "SAP", slug: "sap", isActive: true });
      if (created.isLeft()) throw created.value;

      const uc = new DeleteTechOptionUseCase(repo);
      await uc.execute("profile-erp", created.value.item.id.toString());
      expect(repo.techOptions.get("profile-erp")).toHaveLength(0);
    });
  });

  describe("ToggleTechOptionUseCase", () => {
    it("inverte isActive", async () => {
      const create = new CreateTechOptionUseCase(repo);
      const created = await create.execute({ type: "profile-crm", name: "Pipedrive", slug: "pipedrive", isActive: true });
      if (created.isLeft()) throw created.value;

      const uc = new ToggleTechOptionUseCase(repo);
      const result = await uc.execute("profile-crm", created.value.item.id.toString());
      expect(result.isRight()).toBe(true);
      if (result.isRight()) expect(result.value.item.isActive).toBe(false);
    });

    it("retorna erro para id inexistente", async () => {
      const uc = new ToggleTechOptionUseCase(repo);
      const result = await uc.execute("tech-category", "nao-existe");
      expect(result.isLeft()).toBe(true);
    });
  });

  describe("Todos os 10 tipos de TechOption", () => {
    it.each([
      "tech-category", "tech-language", "tech-framework",
      "profile-language", "profile-framework", "profile-hosting",
      "profile-database", "profile-erp", "profile-crm", "profile-ecommerce",
    ] as const)("cria e lista para tipo: %s", async (type) => {
      const create = new CreateTechOptionUseCase(repo);
      const r = await create.execute({ type, name: `Test ${type}`, slug: `test-${type}`, isActive: true });
      expect(r.isRight()).toBe(true);

      const list = new ListTechOptionsUseCase(repo);
      const lr = await list.execute(type);
      if (lr.isRight()) expect(lr.value.items).toHaveLength(1);
    });
  });
});
