import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

let app: INestApplication;
let prisma: PrismaService;
let adminToken: string;
let sdrToken: string;

const EMAIL = "auth-e2e@test.com";
// Random per-run credential — not a hardcoded secret (avoids secret scanners).
const PASSWORD = randomBytes(12).toString("hex");

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = moduleRef.get(PrismaService);

  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const sdrUser = await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Auth E2E",
      role: "sdr",
      password: await bcrypt.hash(PASSWORD, 10),
    },
  });

  await prisma.user.deleteMany({ where: { email: "auth-e2e-admin@test.com" } });
  const adminUser = await prisma.user.create({
    data: {
      email: "auth-e2e-admin@test.com",
      name: "Auth E2E Admin",
      role: "admin",
      password: await bcrypt.hash(PASSWORD, 10),
    },
  });

  const jwt = moduleRef.get(JwtService);
  adminToken = jwt.sign({ sub: adminUser.id, name: adminUser.name, email: adminUser.email, role: "admin" });
  sdrToken = jwt.sign({ sub: sdrUser.id, name: sdrUser.name, email: sdrUser.email, role: "sdr" });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: [EMAIL, "auth-e2e-admin@test.com", "novo-user-e2e@test.com"] } } });
  await app.close();
});

function login(body: unknown) {
  return request(app.getHttpServer()).post("/auth/login").send(body as object);
}

describe("POST /auth/login (e2e)", () => {
  it("returns 200 + accessToken for valid credentials", async () => {
    const res = await login({ email: EMAIL, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe("string");
    expect(res.body.accessToken.length).toBeGreaterThan(20);
  });

  it("returns 401 for a wrong password", async () => {
    const res = await login({ email: EMAIL, password: "errada" });
    expect(res.status).toBe(401);
  });

  it("returns 401 for an unknown email", async () => {
    const res = await login({ email: "naoexiste@test.com", password: PASSWORD });
    expect(res.status).toBe(401);
  });

  // Regression: an empty/malformed body used to reach the Prisma repo with
  // email=undefined and blow up as 500. It must be a clean 401 now.
  it("returns 401 (not 500) for an empty body", async () => {
    const res = await login({});
    expect(res.status).toBe(401);
  });

  it("returns 401 (not 500) when only email is provided", async () => {
    const res = await login({ email: EMAIL });
    expect(res.status).toBe(401);
  });

  it("returns 401 (not 500) when only password is provided", async () => {
    const res = await login({ password: PASSWORD });
    expect(res.status).toBe(401);
  });
});

describe("POST /auth/register (admin-only, e2e)", () => {
  const novo = { name: "Novo", email: "novo-user-e2e@test.com", password: "senhaforte123" };

  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).post("/auth/register").send(novo).expect(401);
  });

  it("retorna 403 com token de SDR (não-admin)", async () => {
    await request(app.getHttpServer())
      .post("/auth/register").set("Authorization", `Bearer ${sdrToken}`).send(novo).expect(403);
  });

  it("retorna 400 com admin mas senha curta (< 8)", async () => {
    await request(app.getHttpServer())
      .post("/auth/register").set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "X", email: "curta-e2e@test.com", password: "123" }).expect(400);
  });

  it("cria usuário com admin + senha forte (201)", async () => {
    await request(app.getHttpServer())
      .post("/auth/register").set("Authorization", `Bearer ${adminToken}`).send(novo).expect(201);
  });
});

describe("rate limit de login (e2e)", () => {
  // Email dedicado: não colide com o bucket dos outros testes. 5 passam, o 6º é barrado.
  const alvo = { email: "brute-victim-e2e@test.com", password: "qualquer-errada" };

  it("bloqueia na 6ª tentativa com 429 (5/60s por email)", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await request(app.getHttpServer()).post("/auth/login").send(alvo);
      expect(r.status).toBe(401); // email inexistente → credenciais inválidas, mas conta pro limite
    }
    const bloqueado = await request(app.getHttpServer()).post("/auth/login").send(alvo);
    expect(bloqueado.status).toBe(429);
  });
});
