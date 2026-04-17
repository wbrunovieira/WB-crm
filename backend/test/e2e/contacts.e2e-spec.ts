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
let ownerId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  // Create a test user in the database
  const user = await prisma.user.upsert({
    where: { email: "e2e-contacts@test.com" },
    update: {},
    create: {
      email: "e2e-contacts@test.com",
      name: "E2E Contacts User",
      password: "hashed",
      role: "sdr",
    },
  });
  ownerId = user.id;

  // Generate JWT (same secret as NextAuth)
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.contact.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-contacts@test.com" } });
  await app.close();
});

describe("Contacts API (e2e)", () => {
  describe("GET /contacts", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/contacts").expect(401);
    });

    it("retorna lista vazia", async () => {
      const res = await request(app.getHttpServer())
        .get("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body).toBeInstanceOf(Array);
    });

    it("retorna contatos com campos de relação (mesmo que null)", async () => {
      await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Relações E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      const item = res.body[0];
      expect(item).toHaveProperty("organization");
      expect(item).toHaveProperty("lead");
      expect(item).toHaveProperty("partner");
      expect(item).toHaveProperty("owner");
      // No org/lead/partner created in test setup, so these should be null
      expect(item.organization).toBeNull();
      expect(item.lead).toBeNull();
      expect(item.partner).toBeNull();
    });
  });

  describe("POST /contacts", () => {
    it("cria contato com dados válidos", async () => {
      const res = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "João E2E", email: "joao@e2e.com", status: "active" })
        .expect(201);

      expect(res.body.name).toBe("João E2E");
      expect(res.body.email).toBe("joao@e2e.com");
      expect(res.body.id).toBeDefined();
      expect(res.body.ownerId).toBe(ownerId);
    });

    it("retorna 500 para nome vazio", async () => {
      await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "" })
        .expect(500);
    });
  });

  describe("GET /contacts/:id", () => {
    it("retorna contato por id", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Busca E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.name).toBe("Busca E2E");
    });

    it("retorna 404 para id inexistente", async () => {
      await request(app.getHttpServer())
        .get("/contacts/id-que-nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna contato com campos de relação completos incluindo deals e activities", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Detalhe E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.name).toBe("Detalhe E2E");
      expect(res.body).toHaveProperty("organization");
      expect(res.body).toHaveProperty("lead");
      expect(res.body).toHaveProperty("partner");
      expect(res.body).toHaveProperty("owner");
      expect(res.body).toHaveProperty("deals");
      expect(res.body).toHaveProperty("activities");
      expect(res.body.organization).toBeNull();
      expect(res.body.deals).toBeInstanceOf(Array);
      expect(res.body.activities).toBeInstanceOf(Array);
    });
  });

  describe("PATCH /contacts/:id", () => {
    it("atualiza contato", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Original" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Atualizado" })
        .expect(200);

      expect(res.body.name).toBe("Atualizado");
    });
  });

  describe("PATCH /contacts/:id/status", () => {
    it("alterna status de active para inactive", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Toggle E2E", status: "active" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/contacts/${created.body.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.status).toBe("inactive");
    });
  });

  describe("DELETE /contacts/:id", () => {
    it("deleta contato", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Para Deletar" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });
});
