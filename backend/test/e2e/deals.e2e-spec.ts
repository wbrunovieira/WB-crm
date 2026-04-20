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
let stageId: string;
let stageWonId: string;
let stageLostId: string;
let pipelineId: string;

const BASE_PAYLOAD = {
  title: "Website Institucional",
  value: 15000,
  currency: "BRL",
  description: "Desenvolvimento de site institucional com CMS",
  expectedCloseDate: "2025-12-31",
};

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-deals@test.com" },
    update: {},
    create: {
      email: "e2e-deals@test.com",
      name: "E2E Deals User",
      password: "hashed",
      role: "sdr",
    },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  // Create pipeline and stages for tests
  const pipeline = await prisma.pipeline.create({
    data: { name: "E2E Pipeline Deals", isDefault: false },
  });
  pipelineId = pipeline.id;

  const stage = await prisma.stage.create({
    data: { name: "Prospecção", order: 1, pipelineId, probability: 20 },
  });
  stageId = stage.id;

  const stageWon = await prisma.stage.create({
    data: { name: "Ganho", order: 2, pipelineId, probability: 100 },
  });
  stageWonId = stageWon.id;

  const stageLost = await prisma.stage.create({
    data: { name: "Perdido", order: 3, pipelineId, probability: 0 },
  });
  stageLostId = stageLost.id;
});

afterEach(async () => {
  await prisma.deal.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.stage.deleteMany({ where: { pipelineId } });
  await prisma.pipeline.delete({ where: { id: pipelineId } });
  await prisma.user.deleteMany({ where: { email: "e2e-deals@test.com" } });
  await app.close();
});

describe("Deals API (e2e)", () => {

  // ─── GET /deals ────────────────────────────────────────────────────────────

  describe("GET /deals", () => {
    it("retorna 200 com lista vazia", async () => {
      const res = await request(app.getHttpServer())
        .get("/deals")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it("retorna deals criados", async () => {
      await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...BASE_PAYLOAD, stageId });

      const res = await request(app.getHttpServer())
        .get("/deals")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe(BASE_PAYLOAD.title);
    });

    it("filtra por status", async () => {
      await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...BASE_PAYLOAD, stageId });

      const res = await request(app.getHttpServer())
        .get("/deals?status=open")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.every((d: any) => d.status === "open")).toBe(true);
    });

    it("retorna 401 sem token", async () => {
      const res = await request(app.getHttpServer()).get("/deals");
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /deals ───────────────────────────────────────────────────────────

  describe("POST /deals", () => {
    it("cria deal com dados mínimos", async () => {
      const res = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Mínimo", stageId });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe("Deal Mínimo");
      expect(res.body.status).toBe("open");
      expect(res.body.value).toBe(0);
      expect(res.body.currency).toBe("BRL");
    });

    it("cria deal com todos os campos", async () => {
      const res = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...BASE_PAYLOAD, stageId });

      expect(res.status).toBe(201);
      expect(res.body.value).toBe(BASE_PAYLOAD.value);
      expect(res.body.description).toBe(BASE_PAYLOAD.description);
      expect(res.body.expectedCloseDate).toBeTruthy();
    });

    it("retorna 201 e persiste no banco", async () => {
      const res = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...BASE_PAYLOAD, stageId });

      expect(res.status).toBe(201);

      const inDb = await prisma.deal.findUnique({ where: { id: res.body.id } });
      expect(inDb).not.toBeNull();
      expect(inDb?.title).toBe(BASE_PAYLOAD.title);
    });

    it("cria histórico de etapa ao criar deal", async () => {
      const res = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Hist", stageId });

      expect(res.status).toBe(201);

      const history = await prisma.dealStageHistory.findMany({ where: { dealId: res.body.id } });
      expect(history).toHaveLength(1);
      expect(history[0].fromStageId).toBeNull();
      expect(history[0].toStageId).toBe(stageId);
    });

    it("retorna 401 sem token", async () => {
      const res = await request(app.getHttpServer())
        .post("/deals")
        .send({ title: "Deal", stageId });
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /deals/:id ────────────────────────────────────────────────────────

  describe("GET /deals/:id", () => {
    it("retorna deal por ID com relações", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...BASE_PAYLOAD, stageId });

      const res = await request(app.getHttpServer())
        .get(`/deals/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe(BASE_PAYLOAD.title);
      expect(res.body.stage).toBeDefined();
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(Array.isArray(res.body.dealProducts)).toBe(true);
      expect(Array.isArray(res.body.stageHistory)).toBe(true);
    });

    it("retorna 404 para ID inexistente", async () => {
      const res = await request(app.getHttpServer())
        .get("/deals/id-inexistente")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /deals/:id ─────────────────────────────────────────────────────

  describe("PATCH /deals/:id", () => {
    it("atualiza título e valor", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Original", stageId });

      const res = await request(app.getHttpServer())
        .patch(`/deals/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Atualizado", value: 99000 });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe("Deal Atualizado");
      expect(res.body.value).toBe(99000);
    });

    it("marcar como won define closedAt", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Won", stageId });

      const res = await request(app.getHttpServer())
        .patch(`/deals/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ status: "won" });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("won");
      expect(res.body.closedAt).toBeTruthy();
    });

    it("retorna 404 para ID inexistente", async () => {
      const res = await request(app.getHttpServer())
        .patch("/deals/id-inexistente")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "X" });
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /deals/:id/stage ────────────────────────────────────────────────

  describe("PATCH /deals/:id/stage", () => {
    it("move deal para etapa com probability 100 → won", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Stage Won", stageId });

      const res = await request(app.getHttpServer())
        .patch(`/deals/${created.body.id}/stage`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stageId: stageWonId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("won");
      expect(res.body.stageId).toBe(stageWonId);
      expect(res.body.closedAt).toBeTruthy();
    });

    it("move deal para etapa com probability 0 → lost", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Stage Lost", stageId });

      const res = await request(app.getHttpServer())
        .patch(`/deals/${created.body.id}/stage`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stageId: stageLostId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("lost");
    });

    it("move deal para etapa intermediária → open", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Reopen", stageId });

      await request(app.getHttpServer())
        .patch(`/deals/${created.body.id}/stage`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stageId: stageWonId });

      const res = await request(app.getHttpServer())
        .patch(`/deals/${created.body.id}/stage`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stageId });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("open");
    });

    it("cria entrada no histórico ao mover etapa", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Hist Stage", stageId });

      await request(app.getHttpServer())
        .patch(`/deals/${created.body.id}/stage`)
        .set("Authorization", `Bearer ${token}`)
        .send({ stageId: stageWonId });

      const history = await prisma.dealStageHistory.findMany({ where: { dealId: created.body.id } });
      expect(history).toHaveLength(2); // criação + mudança
    });

    it("retorna 404 para ID inexistente", async () => {
      const res = await request(app.getHttpServer())
        .patch("/deals/id-inexistente/stage")
        .set("Authorization", `Bearer ${token}`)
        .send({ stageId });
      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /deals/:id ─────────────────────────────────────────────────────

  describe("DELETE /deals/:id", () => {
    it("deleta deal existente", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Delete", stageId });

      const res = await request(app.getHttpServer())
        .delete(`/deals/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(204);

      const inDb = await prisma.deal.findUnique({ where: { id: created.body.id } });
      expect(inDb).toBeNull();
    });

    it("retorna 404 para ID inexistente", async () => {
      const res = await request(app.getHttpServer())
        .delete("/deals/id-inexistente")
        .set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /deals/stage-history/:historyId ─────────────────────────────────

  describe("PATCH /deals/stage-history/:historyId", () => {
    it("atualiza changedAt do histórico de etapa", async () => {
      const created = await request(app.getHttpServer())
        .post("/deals")
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Deal Stage History", stageId });

      const dealInDb = await prisma.deal.findUnique({
        where: { id: created.body.id },
        include: { stageHistory: true },
      });
      const historyId = dealInDb!.stageHistory[0].id;
      const newDate = "2025-01-15T12:00:00.000Z";

      const res = await request(app.getHttpServer())
        .patch(`/deals/stage-history/${historyId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ changedAt: newDate })
        .expect(200);

      expect(res.body.dealId).toBe(created.body.id);

      const updated = await prisma.dealStageHistory.findUnique({ where: { id: historyId } });
      expect(updated!.changedAt.toISOString()).toBe(newDate);
    });

    it("retorna 404 para historyId inexistente", async () => {
      await request(app.getHttpServer())
        .patch("/deals/stage-history/nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .send({ changedAt: "2025-01-15T12:00:00.000Z" })
        .expect(404);
    });
  });
});
