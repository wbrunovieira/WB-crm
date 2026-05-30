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
let meetingId: string;

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
    where: { email: "e2e-meet-analysis@test.com" },
    update: {},
    create: { email: "e2e-meet-analysis@test.com", name: "E2E Meet User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  // Clean any leftovers from a prior crashed run (owner is reused via upsert).
  await prisma.meetAnalysis.deleteMany({ where: { ownerId } });
  await prisma.meeting.deleteMany({ where: { ownerId } });
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });

  const lead = await prisma.lead.create({
    data: { businessName: "Lead Meet E2E", ownerId, status: "new" },
  });
  leadId = lead.id;

  const activity = await prisma.activity.create({
    data: { type: "meeting", subject: "Reunião diagnóstico E2E", ownerId, leadId },
  });
  activityId = activity.id;

  const meeting = await prisma.meeting.create({
    data: {
      title: "Reunião E2E",
      startAt: new Date(),
      attendeeEmails: "[]",
      ownerId,
      leadId,
      activityId,
      transcriptText: "Discutimos as dores do cliente em profundidade.",
    },
  });
  meetingId = meeting.id;
});

afterEach(async () => {
  await prisma.meetAnalysis.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.meeting.deleteMany({ where: { ownerId } });
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { email: "e2e-meet-analysis@test.com" } });
  await app.close();
});

describe("Meet Analysis API (e2e)", () => {

  describe("GET /meet-analysis", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer())
        .get("/meet-analysis")
        .expect(401);
    });

    it("retorna 200 com lista vazia quando não há análises", async () => {
      const res = await request(app.getHttpServer())
        .get("/meet-analysis")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it("retorna análises do owner após criação manual", async () => {
      await prisma.meetAnalysis.create({
        data: {
          activityId,
          ownerId,
          status: "completed",
          score: 4.5,
          summary: "Reunião produtiva com decisor",
          diagBusiness: "E-commerce B2B",
          diagGaps: "Falta de automação",
          diagUrgency: "Alta urgência",
          diagDecisionPower: "Decisor presente",
          diagEngagement: "Alto engajamento",
          diagClosing: "Próximo passo agendado",
        },
      });

      const res = await request(app.getHttpServer())
        .get("/meet-analysis")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].status).toBe("completed");
      expect(res.body[0].score).toBe(4.5);
      expect(res.body[0].activityId).toBe(activityId);
    });
  });

  describe("GET /meet-analysis/by-activity/:activityId", () => {
    it("retorna 404 quando análise não existe", async () => {
      await request(app.getHttpServer())
        .get(`/meet-analysis/by-activity/${activityId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna análise quando existe", async () => {
      await prisma.meetAnalysis.create({
        data: { activityId, ownerId, status: "pending" },
      });

      const res = await request(app.getHttpServer())
        .get(`/meet-analysis/by-activity/${activityId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.activityId).toBe(activityId);
      expect(res.body.status).toBe("pending");
    });
  });

  describe("POST /webhooks/meet-analysis", () => {
    it("retorna 403 sem secret de webhook", async () => {
      await request(app.getHttpServer())
        .post("/webhooks/meet-analysis")
        .send({ jobId: "qualquer", status: "completed", score: 3 })
        .expect(403);
    });

    it("salva análise via webhook e retorna 200", async () => {
      const meetAnalysis = await prisma.meetAnalysis.create({
        data: { activityId, ownerId, status: "pending", jobId: "meet-job-e2e-001" },
      });

      const payload = {
        jobId: "meet-job-e2e-001",
        status: "completed",
        score: 4.0,
        summary: "Reunião diagnóstico completa",
        diag: {
          business: { model: "Varejo online", text: "Loja online de roupas" },
          gaps: { text: "Logística ruim" },
        },
        positivePoints: ["Cliente engajado"],
        improvementPoints: ["Aprofundar dores"],
      };

      await request(app.getHttpServer())
        .post("/webhooks/meet-analysis")
        .set("x-webhook-secret", process.env.WEBHOOK_SECRET!)
        .send(payload)
        .expect(200);

      const updated = await prisma.meetAnalysis.findUnique({ where: { id: meetAnalysis.id } });
      expect(updated?.status).toBe("completed");
      expect(updated?.score).toBe(4.0);
      // diag fields are persisted JSON-stringified
      expect(JSON.parse(updated!.diagBusiness!).model).toBe("Varejo online");
    });

    it("retorna 404 quando jobId não existe", async () => {
      await request(app.getHttpServer())
        .post("/webhooks/meet-analysis")
        .set("x-webhook-secret", process.env.WEBHOOK_SECRET!)
        .send({ jobId: "job-inexistente", status: "completed", score: 3 })
        .expect(404);
    });
  });
});
