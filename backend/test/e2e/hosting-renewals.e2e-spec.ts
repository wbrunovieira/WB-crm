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
let orgId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-hosting-renewals@test.com" },
    update: {},
    create: { email: "e2e-hosting-renewals@test.com", name: "E2E Hosting User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  const soon = new Date();
  soon.setDate(soon.getDate() + 10);

  const org = await prisma.organization.create({
    data: {
      name: "Org Hosting Test",
      ownerId,
      hasHosting: true,
      hostingRenewalDate: soon,
    },
  });
  orgId = org.id;
});

afterEach(async () => {
  await prisma.activity.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { email: "e2e-hosting-renewals@test.com" } });
  await app.close();
});

describe("GET /hosting-renewals (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/hosting-renewals").expect(401);
  });

  it("retorna organizações com renovação próxima", async () => {
    const res = await request(app.getHttpServer())
      .get("/hosting-renewals")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0].organizationName).toBe("Org Hosting Test");
    expect(res.body[0].daysUntilRenewal).toBeGreaterThan(0);
    expect(res.body[0].daysUntilRenewal).toBeLessThanOrEqual(10);
  });

  it("respeita daysAhead customizado", async () => {
    const res = await request(app.getHttpServer())
      .get("/hosting-renewals?daysAhead=5")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(0);
  });
});

describe("POST /hosting-renewals/:organizationId/activity (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).post(`/hosting-renewals/${orgId}/activity`).expect(401);
  });

  it("cria atividade com padrões", async () => {
    const res = await request(app.getHttpServer())
      .post(`/hosting-renewals/${orgId}/activity`)
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(res.body.activityId).toBeDefined();

    const activity = await prisma.activity.findUnique({ where: { id: res.body.activityId } });
    expect(activity).toBeDefined();
    expect(activity!.subject).toBe("Renovação de hospedagem");
    expect(activity!.type).toBe("task");
    expect(activity!.organizationId).toBe(orgId);
  });

  it("cria atividade com assunto customizado", async () => {
    const res = await request(app.getHttpServer())
      .post(`/hosting-renewals/${orgId}/activity`)
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Contatar cliente para renovar hospedagem" })
      .expect(201);

    const activity = await prisma.activity.findUnique({ where: { id: res.body.activityId } });
    expect(activity!.subject).toBe("Contatar cliente para renovar hospedagem");
  });
});
