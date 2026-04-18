import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

let app: INestApplication;
let prisma: PrismaService;
let jwt: JwtService;
let token: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-admin@test.com" },
    update: {},
    create: { email: "e2e-admin@test.com", name: "E2E Admin User", password: "hashed", role: "admin" },
  });
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.product.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.businessLine.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techCategory.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techLanguage.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techFramework.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techProfileLanguage.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techProfileERP.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techProfileCRM.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techProfileHosting.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techProfileDatabase.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techProfileEcommerce.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
  await prisma.techProfileFramework.deleteMany({ where: { slug: { startsWith: "e2e-" } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-admin@test.com" } });
  await app.close();
});

// ─── Auth guard ───────────────────────────────────────────────────────────────

describe("Admin API - Auth", () => {
  it("retorna 401 sem token em GET /admin/business-lines", async () => {
    await request(app.getHttpServer()).get("/admin/business-lines").expect(401);
  });

  it("retorna 401 sem token em GET /admin/products", async () => {
    await request(app.getHttpServer()).get("/admin/products").expect(401);
  });

  it("retorna 401 sem token em GET /admin/tech-options/tech-category", async () => {
    await request(app.getHttpServer()).get("/admin/tech-options/tech-category").expect(401);
  });
});

// ─── BusinessLine ─────────────────────────────────────────────────────────────

describe("BusinessLine CRUD", () => {
  it("cria e lista linha de negócio", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/business-lines")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Dev Web", slug: "e2e-dev-web", isActive: true, order: 99 })
      .expect(201);

    expect(created.body).toHaveProperty("id");
    expect(created.body.name).toBe("E2E Dev Web");
    expect(created.body.slug).toBe("e2e-dev-web");
    expect(created.body.isActive).toBe(true);

    const list = await request(app.getHttpServer())
      .get("/admin/business-lines")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(list.body).toBeInstanceOf(Array);
    const found = list.body.find((b: { slug: string }) => b.slug === "e2e-dev-web");
    expect(found).toBeDefined();
  });

  it("retorna 422 se nome vazio", async () => {
    await request(app.getHttpServer())
      .post("/admin/business-lines")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "  ", slug: "e2e-x" })
      .expect(422);
  });

  it("atualiza linha de negócio", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/business-lines")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Original", slug: "e2e-original", isActive: true, order: 0 })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/admin/business-lines/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Atualizado", slug: "e2e-atualizado" })
      .expect(200);

    expect(updated.body.name).toBe("E2E Atualizado");
    expect(updated.body.slug).toBe("e2e-atualizado");
  });

  it("toggle ativa/desativa linha de negócio", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/business-lines")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Toggle BL", slug: "e2e-toggle-bl", isActive: true, order: 0 })
      .expect(201);

    const toggled = await request(app.getHttpServer())
      .patch(`/admin/business-lines/${created.body.id}/toggle`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(toggled.body.isActive).toBe(false);
  });

  it("deleta linha de negócio e retorna 204", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/business-lines")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Delete BL", slug: "e2e-delete-bl", isActive: true, order: 0 })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/admin/business-lines/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });

  it("retorna 404 ao atualizar id inexistente", async () => {
    await request(app.getHttpServer())
      .patch("/admin/business-lines/id-nao-existe")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X" })
      .expect(404);
  });
});

// ─── Product ──────────────────────────────────────────────────────────────────

describe("Product CRUD", () => {
  let blId: string;

  beforeAll(async () => {
    const bl = await prisma.businessLine.create({
      data: { name: "E2E BL for Products", slug: "e2e-bl-for-products", isActive: true, order: 0 },
    });
    blId = bl.id;
  });

  afterAll(async () => {
    await prisma.businessLine.deleteMany({ where: { slug: "e2e-bl-for-products" } });
  });

  it("cria e lista produto", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Chatbot", slug: "e2e-chatbot", businessLineId: blId, isActive: true, order: 1 })
      .expect(201);

    expect(created.body).toHaveProperty("id");
    expect(created.body.name).toBe("E2E Chatbot");
    expect(created.body.businessLineId).toBe(blId);

    const list = await request(app.getHttpServer())
      .get(`/admin/products?businessLineId=${blId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const found = list.body.find((p: { slug: string }) => p.slug === "e2e-chatbot");
    expect(found).toBeDefined();
  });

  it("retorna 422 se businessLineId ausente", async () => {
    await request(app.getHttpServer())
      .post("/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "X", slug: "e2e-x", businessLineId: "" })
      .expect(422);
  });

  it("atualiza produto", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Old Prod", slug: "e2e-old-prod", businessLineId: blId, isActive: true, order: 0 })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/admin/products/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E New Prod", basePrice: 2500 })
      .expect(200);

    expect(updated.body.name).toBe("E2E New Prod");
    expect(updated.body.basePrice).toBe(2500);
  });

  it("toggle ativa/desativa produto", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Toggle Prod", slug: "e2e-toggle-prod", businessLineId: blId, isActive: true, order: 0 })
      .expect(201);

    const toggled = await request(app.getHttpServer())
      .patch(`/admin/products/${created.body.id}/toggle`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(toggled.body.isActive).toBe(false);
  });

  it("deleta produto e retorna 204", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Del Prod", slug: "e2e-del-prod", businessLineId: blId, isActive: true, order: 0 })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/admin/products/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });
});

// ─── TechOptions ──────────────────────────────────────────────────────────────

describe("TechOptions — tipo inválido retorna 422", () => {
  it("GET /admin/tech-options/invalid-type retorna 422", async () => {
    await request(app.getHttpServer())
      .get("/admin/tech-options/invalid-type")
      .set("Authorization", `Bearer ${token}`)
      .expect(422);
  });
});

describe("TechOptions CRUD — tech-category", () => {
  it("cria e lista categoria", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/tech-options/tech-category")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Frontend", slug: "e2e-frontend", isActive: true, order: 0 })
      .expect(201);

    expect(created.body.name).toBe("E2E Frontend");
    expect(created.body.slug).toBe("e2e-frontend");

    const list = await request(app.getHttpServer())
      .get("/admin/tech-options/tech-category")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const found = list.body.find((c: { slug: string }) => c.slug === "e2e-frontend");
    expect(found).toBeDefined();
  });

  it("atualiza categoria", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/tech-options/tech-category")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Old Cat", slug: "e2e-old-cat", isActive: true, order: 0 })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/admin/tech-options/tech-category/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E New Cat", slug: "e2e-new-cat" })
      .expect(200);

    expect(updated.body.name).toBe("E2E New Cat");
  });

  it("toggle ativa/desativa categoria", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/tech-options/tech-category")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Toggle Cat", slug: "e2e-toggle-cat", isActive: true, order: 0 })
      .expect(201);

    const toggled = await request(app.getHttpServer())
      .patch(`/admin/tech-options/tech-category/${created.body.id}/toggle`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(toggled.body.isActive).toBe(false);
  });

  it("deleta categoria", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/tech-options/tech-category")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E Del Cat", slug: "e2e-del-cat", isActive: true, order: 0 })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/admin/tech-options/tech-category/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);
  });
});

describe("TechOptions — tech-framework com languageSlug", () => {
  it("cria framework com languageSlug", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/tech-options/tech-framework")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E React", slug: "e2e-react", languageSlug: "javascript", isActive: true })
      .expect(201);

    expect(created.body.languageSlug).toBe("javascript");
  });
});

describe("TechOptions — profile-hosting com subType", () => {
  it("cria hosting com subType", async () => {
    const created = await request(app.getHttpServer())
      .post("/admin/tech-options/profile-hosting")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "E2E AWS", slug: "e2e-aws", subType: "cloud", isActive: true })
      .expect(201);

    expect(created.body.subType).toBe("cloud");
  });
});

describe("TechOptions — todos os 10 tipos", () => {
  it.each([
    "tech-language",
    "profile-language",
    "profile-framework",
    "profile-database",
    "profile-erp",
    "profile-crm",
    "profile-ecommerce",
  ])("GET /admin/tech-options/%s retorna 200", async (type) => {
    await request(app.getHttpServer())
      .get(`/admin/tech-options/${type}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });
});
