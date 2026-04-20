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
    where: { email: "e2e-duplicates@test.com" },
    update: {},
    create: { email: "e2e-duplicates@test.com", name: "E2E Duplicates User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-duplicates@test.com" } });
  await app.close();
});

describe("POST /leads/check-duplicates (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).post("/leads/check-duplicates").send({ cnpj: "123" }).expect(401);
  });

  it("retorna 422 sem critérios", async () => {
    await request(app.getHttpServer())
      .post("/leads/check-duplicates")
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(422);
  });

  it("retorna hasDuplicates=false quando não há leads", async () => {
    const res = await request(app.getHttpServer())
      .post("/leads/check-duplicates")
      .set("Authorization", `Bearer ${token}`)
      .send({ cnpj: "12.345.678/0001-99" })
      .expect(200);

    expect(res.body.hasDuplicates).toBe(false);
    expect(res.body.duplicates).toHaveLength(0);
  });

  it("detecta duplicata por CNPJ", async () => {
    await prisma.lead.create({
      data: { ownerId, businessName: "Acme Tech", companyRegistrationID: "12.345.678/0001-99", status: "new" },
    });

    const res = await request(app.getHttpServer())
      .post("/leads/check-duplicates")
      .set("Authorization", `Bearer ${token}`)
      .send({ cnpj: "12.345.678/0001-99" })
      .expect(200);

    expect(res.body.hasDuplicates).toBe(true);
    expect(res.body.duplicates[0].matchedFields).toContain("cnpj");
  });

  it("detecta duplicata por email (case-insensitive)", async () => {
    await prisma.lead.create({
      data: { ownerId, businessName: "Acme Tech", email: "acme@acme.com", status: "new" },
    });

    const res = await request(app.getHttpServer())
      .post("/leads/check-duplicates")
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "ACME@ACME.COM" })
      .expect(200);

    expect(res.body.hasDuplicates).toBe(true);
  });

  it("não retorna leads de outros usuários", async () => {
    const other = await prisma.user.upsert({
      where: { email: "e2e-dup-other@test.com" },
      update: {},
      create: { email: "e2e-dup-other@test.com", name: "Other", password: "hashed", role: "sdr" },
    });
    await prisma.lead.create({
      data: { ownerId: other.id, businessName: "Acme Tech", companyRegistrationID: "12.345.678/0001-99", status: "new" },
    });

    const res = await request(app.getHttpServer())
      .post("/leads/check-duplicates")
      .set("Authorization", `Bearer ${token}`)
      .send({ cnpj: "12.345.678/0001-99" })
      .expect(200);

    expect(res.body.hasDuplicates).toBe(false);
    await prisma.lead.deleteMany({ where: { ownerId: other.id } });
    await prisma.user.delete({ where: { id: other.id } });
  });
});
