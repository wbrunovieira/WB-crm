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
let adminToken: string;
let sdrToken: string;
let adminId: string;
let sdrId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const admin = await prisma.user.upsert({
    where: { email: "e2e-users-admin@test.com" },
    update: {},
    create: { email: "e2e-users-admin@test.com", name: "Admin User", password: "hashed", role: "admin" },
  });
  adminId = admin.id;
  adminToken = jwt.sign({ sub: admin.id, name: admin.name, email: admin.email, role: admin.role });

  const sdr = await prisma.user.upsert({
    where: { email: "e2e-users-sdr@test.com" },
    update: {},
    create: { email: "e2e-users-sdr@test.com", name: "SDR User", password: "hashed", role: "sdr" },
  });
  sdrId = sdr.id;
  sdrToken = jwt.sign({ sub: sdr.id, name: sdr.name, email: sdr.email, role: sdr.role });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: ["e2e-users-admin@test.com", "e2e-users-sdr@test.com"] } } });
  await app.close();
});

describe("GET /users (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/users").expect(401);
  });

  it("admin recebe todos os usuários", async () => {
    const res = await request(app.getHttpServer())
      .get("/users")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body.every((u: any) => !u.passwordHash)).toBe(true);
  });

  it("sdr recebe apenas a si mesmo", async () => {
    const res = await request(app.getHttpServer())
      .get("/users")
      .set("Authorization", `Bearer ${sdrToken}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(sdrId);
  });
});
