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
let userId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-pipelines@test.com" },
    update: {},
    create: { email: "e2e-pipelines@test.com", name: "E2E Pipelines User", password: "hashed", role: "admin" },
  });
  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  // Delete test pipelines (cascades to stages)
  await prisma.pipeline.deleteMany({ where: { name: { startsWith: "E2E" } } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-pipelines@test.com" } });
  await app.close();
});

describe("Pipelines API (e2e)", () => {

  // ─── GET /pipelines ────────────────────────────────────────────────────

  describe("GET /pipelines", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/pipelines").expect(401);
    });

    it("retorna lista de pipelines com estágios", async () => {
      await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Lista" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      const p = res.body.find((p: { name: string }) => p.name === "E2E Pipeline Lista");
      expect(p).toBeDefined();
      expect(p.stages).toBeInstanceOf(Array);
      expect(p.stages.length).toBe(4); // 4 default stages
    });
  });

  // ─── POST /pipelines ───────────────────────────────────────────────────

  describe("POST /pipelines", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).post("/pipelines").send({ name: "X" }).expect(401);
    });

    it("cria pipeline e auto-cria 4 estágios padrão", async () => {
      const res = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Criar" })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("E2E Pipeline Criar");
      expect(res.body.isDefault).toBe(false);

      // Verify 4 stages were created
      const detail = await request(app.getHttpServer())
        .get(`/pipelines/${res.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(detail.body.stages).toHaveLength(4);
      const stageNames = detail.body.stages.map((s: { name: string }) => s.name);
      expect(stageNames).toContain("Qualificação");
      expect(stageNames).toContain("Proposta");
      expect(stageNames).toContain("Negociação");
      expect(stageNames).toContain("Fechamento");
    });

    it("cria pipeline como padrão", async () => {
      const res = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Padrão", isDefault: true })
        .expect(201);

      expect(res.body.isDefault).toBe(true);

      // Cleanup: unset default
      await prisma.pipeline.update({ where: { id: res.body.id }, data: { isDefault: false } });
    });
  });

  // ─── GET /pipelines/:id ────────────────────────────────────────────────

  describe("GET /pipelines/:id", () => {
    it("retorna pipeline com estágios e deal count", async () => {
      const created = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Detalhe" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/pipelines/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.name).toBe("E2E Pipeline Detalhe");
      expect(res.body.stages).toBeInstanceOf(Array);
      expect(res.body.stages[0]).toHaveProperty("_count");
      expect(res.body.stages[0]._count).toHaveProperty("deals");
    });

    it("retorna 404 quando pipeline não existe", async () => {
      await request(app.getHttpServer())
        .get("/pipelines/id-inexistente-e2e")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── PATCH /pipelines/:id ──────────────────────────────────────────────

  describe("PATCH /pipelines/:id", () => {
    it("atualiza nome do pipeline", async () => {
      const created = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Original" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/pipelines/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Atualizado" })
        .expect(200);

      expect(res.body.name).toBe("E2E Pipeline Atualizado");
    });

    it("retorna 404 quando pipeline não existe", async () => {
      await request(app.getHttpServer())
        .patch("/pipelines/nao-existe-e2e")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "X" })
        .expect(404);
    });
  });

  // ─── PATCH /pipelines/:id/set-default ─────────────────────────────────

  describe("PATCH /pipelines/:id/set-default", () => {
    it("define pipeline como padrão", async () => {
      const p = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Set Default" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/pipelines/${p.body.id}/set-default`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.isDefault).toBe(true);

      // Cleanup
      await prisma.pipeline.update({ where: { id: p.body.id }, data: { isDefault: false } });
    });
  });

  // ─── DELETE /pipelines/:id ─────────────────────────────────────────────

  describe("DELETE /pipelines/:id", () => {
    it("deleta pipeline não-padrão e retorna 204", async () => {
      const created = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Deletar" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/pipelines/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/pipelines/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna 422 ao tentar deletar pipeline padrão", async () => {
      const p = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Padrão Delete", isDefault: true })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/pipelines/${p.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(422);

      // Cleanup
      await prisma.pipeline.update({ where: { id: p.body.id }, data: { isDefault: false } });
    });
  });

  // ─── Stages ────────────────────────────────────────────────────────────

  describe("POST /pipelines/stages", () => {
    it("cria estágio em pipeline existente", async () => {
      const pipeline = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Stage Criar" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post("/pipelines/stages")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Validação Técnica", order: 5, probability: 80, pipelineId: pipeline.body.id })
        .expect(201);

      expect(res.body.name).toBe("Validação Técnica");
      expect(res.body.order).toBe(5);
      expect(res.body.probability).toBe(80);
      expect(res.body.pipelineId).toBe(pipeline.body.id);
    });

    it("retorna erro quando pipeline não existe", async () => {
      await request(app.getHttpServer())
        .post("/pipelines/stages")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Estágio Órfão", order: 1, probability: 10, pipelineId: "nao-existe" })
        .expect(404);
    });
  });

  describe("PATCH /pipelines/stages/:id", () => {
    it("atualiza nome e probabilidade do estágio", async () => {
      const pipeline = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Stage Update" })
        .expect(201);

      const detail = await request(app.getHttpServer())
        .get(`/pipelines/${pipeline.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const stageId = detail.body.stages[0].id;

      const res = await request(app.getHttpServer())
        .patch(`/pipelines/stages/${stageId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Estágio Atualizado", probability: 45 })
        .expect(200);

      expect(res.body.name).toBe("Estágio Atualizado");
      expect(res.body.probability).toBe(45);
    });
  });

  describe("PATCH /pipelines/:pipelineId/stages/reorder", () => {
    it("reordena estágios e retorna ok", async () => {
      const pipeline = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Reorder" })
        .expect(201);

      const detail = await request(app.getHttpServer())
        .get(`/pipelines/${pipeline.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const stageIds = detail.body.stages.map((s: { id: string }) => s.id).reverse();

      const res = await request(app.getHttpServer())
        .patch(`/pipelines/${pipeline.body.id}/stages/reorder`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stageIds })
        .expect(200);

      expect(res.body.ok).toBe(true);
    });
  });

  describe("DELETE /pipelines/stages/:id", () => {
    it("deleta estágio sem deals e retorna 204", async () => {
      const pipeline = await request(app.getHttpServer())
        .post("/pipelines")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "E2E Pipeline Stage Delete" })
        .expect(201);

      // Add a new stage (not linked to any deals)
      const stage = await request(app.getHttpServer())
        .post("/pipelines/stages")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Estágio Para Deletar", order: 5, probability: 50, pipelineId: pipeline.body.id })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/pipelines/stages/${stage.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);
    });
  });
});
