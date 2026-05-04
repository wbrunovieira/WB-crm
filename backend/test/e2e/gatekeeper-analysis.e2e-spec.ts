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
    it("salva análise via webhook e retorna 201", async () => {
      const gkAnalysis = await prisma.gatekeeperAnalysis.create({
        data: { activityId, ownerId, status: "pending", jobId: "gk-job-e2e-001" },
      });

      const payload = {
        jobId: "gk-job-e2e-001",
        status: "completed",
        score: 3.8,
        summary: "Ligação com gatekeeper difícil",
        raportRecepcao: "Recepção fria",
        raportAlianca: "Aliança não estabelecida",
        raportPerguntas: "Poucas perguntas",
        raportObjecoes: "Várias objeções",
        raportResultado: "Não transferiu",
        raportTecnicas: "Técnicas limitadas",
        positivePoints: "Tom amigável",
        improvementPoints: "Precisa de mais rapport",
      };

      await request(app.getHttpServer())
        .post("/webhooks/gatekeeper-analysis")
        .send(payload)
        .expect(201);

      const updated = await prisma.gatekeeperAnalysis.findUnique({ where: { id: gkAnalysis.id } });
      expect(updated?.status).toBe("completed");
      expect(updated?.score).toBe(3.8);
      expect(updated?.raportRecepcao).toBe("Recepção fria");
    });

    it("retorna 404 quando jobId não existe", async () => {
      await request(app.getHttpServer())
        .post("/webhooks/gatekeeper-analysis")
        .send({ jobId: "job-inexistente", status: "completed", score: 3 })
        .expect(404);
    });
  });
});
