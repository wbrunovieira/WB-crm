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
    where: { email: "e2e-meetings@test.com" },
    update: {},
    create: { email: "e2e-meetings@test.com", name: "Meetings User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.meeting.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-meetings@test.com" } });
  await app.close();
});

describe("GET /meetings (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/meetings").expect(401);
  });

  it("retorna lista vazia", async () => {
    const res = await request(app.getHttpServer())
      .get("/meetings")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /meetings (e2e)", () => {
  it("cria reunião", async () => {
    const res = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Reunião de alinhamento",
        startAt: "2026-04-21T14:00:00.000Z",
        attendeeEmails: ["cliente@exemplo.com"],
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe("Reunião de alinhamento");
    expect(res.body.status).toBe("scheduled");
    expect(Array.isArray(res.body.attendeeEmails)).toBe(true);
  });
});

describe("PATCH /meetings/:id (e2e)", () => {
  it("atualiza título da reunião", async () => {
    const created = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Reunião original", startAt: "2026-04-21T14:00:00.000Z" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/meetings/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Reunião atualizada" })
      .expect(200);

    expect(res.body.title).toBe("Reunião atualizada");
  });

  it("retorna 404 para reunião inexistente", async () => {
    await request(app.getHttpServer())
      .patch("/meetings/inexistente")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "X" })
      .expect(404);
  });
});

describe("DELETE /meetings/:id (e2e)", () => {
  it("cancela reunião (seta status cancelled)", async () => {
    const created = await request(app.getHttpServer())
      .post("/meetings")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Para cancelar", startAt: "2026-04-21T14:00:00.000Z" })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/meetings/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const meeting = await prisma.meeting.findUnique({ where: { id: created.body.id } });
    expect(meeting!.status).toBe("cancelled");
  });
});
