import { describe, it, expect, beforeAll, afterAll } from "vitest";
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
    where: { email: "e2e-dashboard@test.com" },
    update: {},
    create: { email: "e2e-dashboard@test.com", name: "Dashboard User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-dashboard@test.com" } });
  await app.close();
});

describe("GET /dashboard/stats (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/dashboard/stats").expect(401);
  });

  it("retorna stats com array", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/stats")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /dashboard/timeline (e2e)", () => {
  it("retorna timeline com array", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/timeline")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("GET /dashboard/activity-calendar (e2e)", () => {
  it("retorna calendar com array", async () => {
    const res = await request(app.getHttpServer())
      .get("/dashboard/activity-calendar")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
