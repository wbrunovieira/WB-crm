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
let activityId: string;
let leadId: string;

beforeAll(async () => {
  process.env.WEBHOOK_SECRET = "e2e-webhook-secret";

  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-gk-analysis@test.com" },
    update: {},
    create: { email: "e2e-gk-analysis@test.com", name: "E2E GK User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  // Clean any leftovers from a prior crashed run (owner is reused via upsert).
  await prisma.gatekeeperAnalysis.deleteMany({ where: { ownerId } });
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });

  const lead = await prisma.lead.create({
    data: { businessName: "Lead GK E2E", ownerId, status: "new" },
  });
  leadId = lead.id;

  const activity = await prisma.activity.create({
    data: {
      type: "call",
      subject: "Ligação GK E2E",
      ownerId,
      leadId,
      gotoCallId: "goto-gk-e2e-001",
      callContactType: "gatekeeper",
      gotoTranscriptText: "Olá, posso falar com o responsável?",
    },
  });
  activityId = activity.id;
});

afterEach(async () => {
  await prisma.gatekeeperAnalysis.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { email: "e2e-gk-analysis@test.com" } });
  await app.close();
});

describe("Gatekeeper Analysis API (e2e)", () => {

  describe("GET /gatekeeper-analysis", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/gatekeeper-analysis")
        .expect(401);
    });

    it("retorna 200 com lista vazia quando não há análises", async () => {
      const res = await request(app.getHttpServer())
        .get("/gatekeeper-analysis")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("retorna análises do owner após criação manual", async () => {
      await prisma.gatekeeperAnalysis.create({
        data: {
          activityId,
          ownerId,
          status: "completed",
          score: 4.2,
          raportRecepcao: "Boa recepção",
          raportAlianca: "Aliança construída",
          raportPerguntas: "Perguntas diretas",
          raportObjecoes: "Sem objeções fortes",
          raportResultado: "Transferiu para decisor",
          raportTecnicas: "Técnicas básicas usadas",
        },
      });

      const res = await request(app.getHttpServer())
        .get("/gatekeeper-analysis")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe("completed");
      expect(res.body[0].score).toBe(4.2);
      expect(res.body[0].activityId).toBe(activityId);
    });
  });

  describe("GET /gatekeeper-analysis/by-activity/:activityId", () => {
    it("retorna 404 quando análise não existe", async () => {
      await request(app.getHttpServer())
        .get(`/gatekeeper-analysis/by-activity/${activityId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna análise quando existe", async () => {
      await prisma.gatekeeperAnalysis.create({
        data: { activityId, ownerId, status: "pending" },
      });

      const res = await request(app.getHttpServer())
        .get(`/gatekeeper-analysis/by-activity/${activityId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.activityId).toBe(activityId);
      expect(res.body.status).toBe("pending");
    });
  });

  describe("POST /webhooks/gatekeeper-analysis", () => {
    it("retorna 403 sem secret de webhook", async () => {
      await request(app.getHttpServer())
        .post("/webhooks/gatekeeper-analysis")
        .send({ jobId: "qualquer", status: "completed", score: 3 })
        .expect(403);
    });

    it("salva análise via webhook e retorna 200", async () => {
      const gkAnalysis = await prisma.gatekeeperAnalysis.create({
        data: { activityId, ownerId, status: "pending", jobId: "gk-job-e2e-001" },
      });

      const payload = {
        jobId: "gk-job-e2e-001",
        status: "completed",
        score: 3.8,
        summary: "Ligação com gatekeeper difícil",
        raport: {
          recepcao: { text: "Recepção fria", score: 2 },
          alianca: { text: "Aliança não estabelecida" },
          resultado: { outcome: "Não transferiu", text: "Não transferiu" },
        },
        positivePoints: ["Tom amigável"],
        improvementPoints: ["Precisa de mais rapport"],
      };

      await request(app.getHttpServer())
        .post("/webhooks/gatekeeper-analysis")
        .set("x-webhook-secret", process.env.WEBHOOK_SECRET!)
        .send(payload)
        .expect(200);

      const updated = await prisma.gatekeeperAnalysis.findUnique({ where: { id: gkAnalysis.id } });
      expect(updated?.status).toBe("completed");
      expect(updated?.score).toBe(3.8);
      // raport dimensions are persisted JSON-stringified
      expect(JSON.parse(updated!.raportRecepcao!).text).toBe("Recepção fria");
    });

    it("retorna 404 quando jobId não existe", async () => {
      await request(app.getHttpServer())
        .post("/webhooks/gatekeeper-analysis")
        .set("x-webhook-secret", process.env.WEBHOOK_SECRET!)
        .send({ jobId: "job-inexistente", status: "completed", score: 3 })
        .expect(404);
    });
  });
});
