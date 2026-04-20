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
    where: { email: "e2e-funnel@test.com" },
    update: {},
    create: { email: "e2e-funnel@test.com", name: "Funnel User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.weeklyGoal.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-funnel@test.com" } });
  await app.close();
});

describe("GET /funnel/stats (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/funnel/stats").expect(401);
  });

  it("retorna stats do funil", async () => {
    const res = await request(app.getHttpServer())
      .get("/funnel/stats")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveProperty("leadsTotal");
    expect(res.body).toHaveProperty("dealsWon");
  });
});

describe("POST /funnel/goals + GET /funnel/goals (e2e)", () => {
  it("cria e busca meta semanal", async () => {
    const weekStart = "2026-04-14T00:00:00.000Z";
    await request(app.getHttpServer())
      .post("/funnel/goals")
      .set("Authorization", `Bearer ${token}`)
      .send({ weekStart, targetSales: 10 })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get("/funnel/goals")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].targetSales).toBe(10);
  });

  it("upsert atualiza meta existente", async () => {
    const weekStart = "2026-04-14T00:00:00.000Z";
    await request(app.getHttpServer())
      .post("/funnel/goals")
      .set("Authorization", `Bearer ${token}`)
      .send({ weekStart, targetSales: 5 })
      .expect(201);

    await request(app.getHttpServer())
      .post("/funnel/goals")
      .set("Authorization", `Bearer ${token}`)
      .send({ weekStart, targetSales: 15 })
      .expect(201);

    const count = await prisma.weeklyGoal.count({ where: { ownerId } });
    expect(count).toBe(1);

    const goal = await prisma.weeklyGoal.findFirst({ where: { ownerId } });
    expect(goal!.targetSales).toBe(15);
  });
});
