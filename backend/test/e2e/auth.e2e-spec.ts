import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";

let app: INestApplication;
let prisma: PrismaService;

const EMAIL = "auth-e2e@test.com";
// Random per-run credential — not a hardcoded secret (avoids secret scanners).
const PASSWORD = randomBytes(12).toString("hex");

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
  prisma = moduleRef.get(PrismaService);

  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Auth E2E",
      role: "sdr",
      password: await bcrypt.hash(PASSWORD, 10),
    },
  });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
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
