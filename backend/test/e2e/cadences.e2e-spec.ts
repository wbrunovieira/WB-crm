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
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-cadences@test.com" },
    update: {},
    create: { email: "e2e-cadences@test.com", name: "E2E Cadences User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.leadCadence.deleteMany({ where: { ownerId } });
  await prisma.cadence.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-cadences@test.com" } });
  await app.close();
});

describe("GET /cadences (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/cadences").expect(401);
  });

  it("retorna lista vazia inicialmente", async () => {
    const res = await request(app.getHttpServer())
      .get("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /cadences (e2e)", () => {
  it("cria cadência com slug automático", async () => {
    const res = await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Cadência IFEE 14 Dias", durationDays: 14 })
      .expect(201);

    expect(res.body.name).toBe("Cadência IFEE 14 Dias");
    expect(res.body.slug).toBe("cadencia-ifee-14-dias");
    expect(res.body.status).toBe("draft");
  });

  it("rejeita nome vazio", async () => {
    await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(422);
  });

  it("rejeita slug duplicado", async () => {
    await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Duplicado" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Duplicado" })
      .expect(409);
  });
});

describe("PATCH /cadences/:id/publish (e2e)", () => {
  it("publica uma cadência draft", async () => {
    const created = await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Publicar Teste" })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/cadences/${created.body.id}/publish`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const cadence = await prisma.cadence.findUnique({ where: { id: created.body.id } });
    expect(cadence!.status).toBe("active");
  });
});

describe("Steps (e2e)", () => {
  it("cria e lista steps de uma cadência", async () => {
    const cadence = await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Step Test" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cadences/${cadence.body.id}/steps`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dayNumber: 1, channel: "email", subject: "Contato inicial" })
      .expect(201);

    const steps = await request(app.getHttpServer())
      .get(`/cadences/${cadence.body.id}/steps`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(steps.body).toHaveLength(1);
    expect(steps.body[0].dayNumber).toBe(1);
  });
});

describe("POST /cadences/:id/apply (e2e)", () => {
  it("aplica cadência a um lead e gera atividades", async () => {
    const lead = await prisma.lead.create({ data: { ownerId, businessName: "Lead Cadência", status: "new" } });

    const cadence = await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Aplicar Cadência" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cadences/${cadence.body.id}/steps`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dayNumber: 1, channel: "email", subject: "Dia 1" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cadences/${cadence.body.id}/steps`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dayNumber: 3, channel: "call", subject: "Dia 3" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/cadences/${cadence.body.id}/apply`)
      .set("Authorization", `Bearer ${token}`)
      .send({ leadId: lead.id })
      .expect(201);

    expect(res.body.leadCadenceId).toBeDefined();
    expect(res.body.activities).toHaveLength(2);

    const activitiesInDb = await prisma.activity.findMany({ where: { leadId: lead.id } });
    expect(activitiesInDb).toHaveLength(2);
  });
});

describe("Lead cadence lifecycle (e2e)", () => {
  it("pausa e retoma cadência do lead", async () => {
    const lead = await prisma.lead.create({ data: { ownerId, businessName: "Lifecycle Lead", status: "new" } });

    const cadence = await request(app.getHttpServer())
      .post("/cadences")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Lifecycle Test" })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/cadences/${cadence.body.id}/steps`)
      .set("Authorization", `Bearer ${token}`)
      .send({ dayNumber: 1, channel: "email", subject: "Hi" })
      .expect(201);

    const applied = await request(app.getHttpServer())
      .post(`/cadences/${cadence.body.id}/apply`)
      .set("Authorization", `Bearer ${token}`)
      .send({ leadId: lead.id })
      .expect(201);

    const lcId = applied.body.leadCadenceId;

    await request(app.getHttpServer())
      .patch(`/cadences/lead-cadences/${lcId}/pause`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    let lc = await prisma.leadCadence.findUnique({ where: { id: lcId } });
    expect(lc!.status).toBe("paused");

    await request(app.getHttpServer())
      .patch(`/cadences/lead-cadences/${lcId}/resume`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    lc = await prisma.leadCadence.findUnique({ where: { id: lcId } });
    expect(lc!.status).toBe("active");
  });
});
