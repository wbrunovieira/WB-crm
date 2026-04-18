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

const BASE_PAYLOAD = {
  type: "call",
  subject: "Ligação de prospecção",
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
    where: { email: "e2e-activities@test.com" },
    update: {},
    create: {
      email: "e2e-activities@test.com",
      name: "E2E Activities User",
      password: "hashed",
      role: "sdr",
    },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.activity.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-activities@test.com" } });
  await app.close();
});

describe("Activities API (e2e)", () => {

  // ─── GET /activities ───────────────────────────────────────────────────────

  describe("GET /activities", () => {
    it("retorna 200 com lista vazia", async () => {
      const res = await request(app.getHttpServer())
        .get("/activities")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it("retorna atividades criadas", async () => {
      await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      const res = await request(app.getHttpServer())
        .get("/activities")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].subject).toBe(BASE_PAYLOAD.subject);
    });

    it("filtra por type", async () => {
      await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "call", subject: "Call" });

      await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "meeting", subject: "Meeting" });

      const res = await request(app.getHttpServer())
        .get("/activities?type=call")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].type).toBe("call");
    });

    it("filtra por completed", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/toggle-completed`)
        .set("Authorization", `Bearer ${token}`);

      await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send({ type: "meeting", subject: "Pending" });

      const res = await request(app.getHttpServer())
        .get("/activities?completed=true")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.every((a: any) => a.completed === true)).toBe(true);
    });

    it("retorna 401 sem token", async () => {
      const res = await request(app.getHttpServer()).get("/activities");
      expect(res.status).toBe(401);
    });
  });

  // ─── POST /activities ──────────────────────────────────────────────────────

  describe("POST /activities", () => {
    it("cria atividade com dados mínimos", async () => {
      const res = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      expect(res.status).toBe(201);
      expect(res.body.type).toBe("call");
      expect(res.body.subject).toBe(BASE_PAYLOAD.subject);
      expect(res.body.completed).toBe(false);
      expect(res.body.ownerId).toBe(ownerId);
    });

    it("cria atividade com campos opcionais", async () => {
      const res = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send({
          type: "meeting",
          subject: "Reunião de kickoff",
          description: "Alinhamento inicial do projeto",
          dueDate: "2025-12-01T10:00:00.000Z",
        });

      expect(res.status).toBe(201);
      expect(res.body.description).toBe("Alinhamento inicial do projeto");
      expect(res.body.dueDate).toBeTruthy();
    });

    it("retorna 201 e persiste no banco", async () => {
      const res = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      expect(res.status).toBe(201);

      const inDb = await prisma.activity.findUnique({ where: { id: res.body.id } });
      expect(inDb).not.toBeNull();
      expect(inDb?.subject).toBe(BASE_PAYLOAD.subject);
    });

    it("retorna 401 sem token", async () => {
      const res = await request(app.getHttpServer())
        .post("/activities")
        .send(BASE_PAYLOAD);
      expect(res.status).toBe(401);
    });
  });

  // ─── GET /activities/:id ───────────────────────────────────────────────────

  describe("GET /activities/:id", () => {
    it("retorna atividade pelo id", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      const res = await request(app.getHttpServer())
        .get(`/activities/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(created.body.id);
      expect(res.body.subject).toBe(BASE_PAYLOAD.subject);
    });

    it("retorna 404 para id inexistente", async () => {
      const res = await request(app.getHttpServer())
        .get("/activities/non-existent-id")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /activities/:id ─────────────────────────────────────────────────

  describe("PATCH /activities/:id", () => {
    it("atualiza campos da atividade", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      const res = await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ subject: "Ligação atualizada", type: "meeting" });

      expect(res.status).toBe(200);
      expect(res.body.subject).toBe("Ligação atualizada");
      expect(res.body.type).toBe("meeting");
    });

    it("retorna 404 para id inexistente", async () => {
      const res = await request(app.getHttpServer())
        .patch("/activities/non-existent-id")
        .set("Authorization", `Bearer ${token}`)
        .send({ subject: "Updated" });

      expect(res.status).toBe(404);
    });
  });

  // ─── DELETE /activities/:id ────────────────────────────────────────────────

  describe("DELETE /activities/:id", () => {
    it("deleta atividade e retorna 204", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      const res = await request(app.getHttpServer())
        .delete(`/activities/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(204);

      const inDb = await prisma.activity.findUnique({ where: { id: created.body.id } });
      expect(inDb).toBeNull();
    });

    it("retorna 404 para id inexistente", async () => {
      const res = await request(app.getHttpServer())
        .delete("/activities/non-existent-id")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  // ─── PATCH /activities/:id/toggle-completed ────────────────────────────────

  describe("PATCH /activities/:id/toggle-completed", () => {
    it("alterna completed para true e seta completedAt", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      const res = await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/toggle-completed`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(true);
      expect(res.body.completedAt).toBeTruthy();
    });

    it("alterna completed de volta para false", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/toggle-completed`)
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/toggle-completed`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.completed).toBe(false);
      expect(res.body.completedAt).toBeNull();
    });
  });

  // ─── PATCH /activities/:id/fail ────────────────────────────────────────────

  describe("PATCH /activities/:id/fail", () => {
    it("marca atividade como falha", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      const res = await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/fail`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Não atendeu" });

      expect(res.status).toBe(200);
      expect(res.body.failedAt).toBeTruthy();
      expect(res.body.failReason).toBe("Não atendeu");
      expect(res.body.skippedAt).toBeNull();
    });
  });

  // ─── PATCH /activities/:id/skip ────────────────────────────────────────────

  describe("PATCH /activities/:id/skip", () => {
    it("marca atividade como pulada", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      const res = await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/skip`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Sem tempo hoje" });

      expect(res.status).toBe(200);
      expect(res.body.skippedAt).toBeTruthy();
      expect(res.body.skipReason).toBe("Sem tempo hoje");
      expect(res.body.failedAt).toBeNull();
    });
  });

  // ─── PATCH /activities/:id/revert ─────────────────────────────────────────

  describe("PATCH /activities/:id/revert", () => {
    it("reverte outcome de fail", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/fail`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Falhou" });

      const res = await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/revert`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.failedAt).toBeNull();
      expect(res.body.failReason).toBeNull();
    });

    it("reverte outcome de skip", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/skip`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Pulou" });

      const res = await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}/revert`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.skippedAt).toBeNull();
      expect(res.body.skipReason).toBeNull();
    });
  });

  // ─── POST /activities/:id/deals/:dealId ───────────────────────────────────

  describe("POST /activities/:id/deals/:dealId", () => {
    it("vincula atividade a um deal secundário", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      // Create a pipeline/stage/deal for linking
      const pipeline = await prisma.pipeline.create({ data: { name: "E2E Link Pipeline", isDefault: false } });
      const stage = await prisma.stage.create({ data: { name: "Prosp", order: 1, pipelineId: pipeline.id, probability: 20 } });
      const deal = await prisma.deal.create({ data: { title: "Deal Link", ownerId, stageId: stage.id } });

      const res = await request(app.getHttpServer())
        .post(`/activities/${created.body.id}/deals/${deal.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      const additionalIds = JSON.parse(res.body.additionalDealIds ?? "[]");
      expect(additionalIds).toContain(deal.id);

      // Cleanup
      await prisma.deal.delete({ where: { id: deal.id } });
      await prisma.stage.delete({ where: { id: stage.id } });
      await prisma.pipeline.delete({ where: { id: pipeline.id } });
    });
  });

  // ─── DELETE /activities/:id/deals/:dealId ─────────────────────────────────

  describe("DELETE /activities/:id/deals/:dealId", () => {
    it("desvincula atividade de um deal secundário", async () => {
      const pipeline = await prisma.pipeline.create({ data: { name: "E2E Unlink Pipeline", isDefault: false } });
      const stage = await prisma.stage.create({ data: { name: "Prosp", order: 1, pipelineId: pipeline.id, probability: 20 } });
      const deal = await prisma.deal.create({ data: { title: "Deal Unlink", ownerId, stageId: stage.id } });

      const created = await request(app.getHttpServer())
        .post("/activities")
        .set("Authorization", `Bearer ${token}`)
        .send(BASE_PAYLOAD);

      await request(app.getHttpServer())
        .post(`/activities/${created.body.id}/deals/${deal.id}`)
        .set("Authorization", `Bearer ${token}`);

      const res = await request(app.getHttpServer())
        .delete(`/activities/${created.body.id}/deals/${deal.id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      const additionalIds = JSON.parse(res.body.additionalDealIds ?? "[]");
      expect(additionalIds).not.toContain(deal.id);

      // Cleanup
      await prisma.deal.delete({ where: { id: deal.id } });
      await prisma.stage.delete({ where: { id: stage.id } });
      await prisma.pipeline.delete({ where: { id: pipeline.id } });
    });
  });
});
