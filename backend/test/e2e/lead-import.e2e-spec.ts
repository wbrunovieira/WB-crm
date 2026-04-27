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
    where: { email: "e2e-lead-import@test.com" },
    update: {},
    create: { email: "e2e-lead-import@test.com", name: "E2E Import User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-lead-import@test.com" } });
  await app.close();
});

describe("POST /lead-import (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).post("/lead-import").send({ rows: [] }).expect(401);
  });

  it("importa batch vazio sem erros", async () => {
    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [] })
      .expect(201);
    expect(res.body.total).toBe(0);
    expect(res.body.imported).toBe(0);
  });

  it("importa leads válidos", async () => {
    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rows: [
          { businessName: "Empresa A", city: "São Paulo", source: "csv" },
          { businessName: "Empresa B", city: "Rio de Janeiro" },
        ],
      })
      .expect(201);

    expect(res.body.total).toBe(2);
    expect(res.body.imported).toBe(2);
    expect(res.body.skipped).toBe(0);
    expect(res.body.errors).toHaveLength(0);

    const leads = await prisma.lead.findMany({ where: { ownerId } });
    expect(leads).toHaveLength(2);
    expect(leads.find(l => l.businessName === "Empresa A")?.source).toBe("csv");
    expect(leads.find(l => l.businessName === "Empresa B")?.source).toBe("import");
  });

  it("pula duplicados por nome (case-insensitive)", async () => {
    await prisma.lead.create({ data: { businessName: "Existente", ownerId, status: "new" } });

    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [{ businessName: "EXISTENTE" }, { businessName: "Nova" }] })
      .expect(201);

    expect(res.body.skipped).toBe(1);
    expect(res.body.imported).toBe(1);
  });

  it("reporta erros para nomes vazios", async () => {
    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({
        rows: [
          { businessName: "Valida" },
          { businessName: "" },
          { businessName: "  " },
        ],
      })
      .expect(201);

    expect(res.body.imported).toBe(1);
    expect(res.body.errors).toHaveLength(2);
  });

  it("deduplicates intra-batch", async () => {
    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [{ businessName: "Dup" }, { businessName: "Dup" }] })
      .expect(201);

    expect(res.body.imported).toBe(1);
    expect(res.body.skipped).toBe(1);
  });

  it("retorna skippedDetails com reason quando há duplicatas", async () => {
    await prisma.lead.create({ data: { businessName: "Lead Existente", ownerId, status: "new" } });

    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [{ businessName: "Lead Existente" }, { businessName: "Lead Nova" }] })
      .expect(201);

    expect(res.body.skipped).toBe(1);
    expect(res.body.skippedDetails).toHaveLength(1);
    expect(res.body.skippedDetails[0].reason).toBe("name");
    expect(res.body.skippedDetails[0].businessName).toBe("Lead Existente");
    expect(res.body.skippedDetails[0].rowIndex).toBe(0);
    expect(res.body.imported).toBe(1);
  });

  it("importa duplicatas quando skipDuplicates=true", async () => {
    await prisma.lead.create({ data: { businessName: "Lead Dup E2E", ownerId, status: "new" } });

    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [{ businessName: "Lead Dup E2E" }], skipDuplicates: true })
      .expect(201);

    expect(res.body.imported).toBe(1);
    expect(res.body.skipped).toBe(0);
    expect(res.body.skippedDetails).toHaveLength(0);
  });

  it("skippedDetails includes existingLeadId for DB duplicates", async () => {
    const existingLead = await prisma.lead.create({
      data: { businessName: "Lead Com Id", ownerId, status: "new" },
    });

    const res = await request(app.getHttpServer())
      .post("/lead-import")
      .set("Authorization", `Bearer ${token}`)
      .send({ rows: [{ businessName: "Lead Com Id" }] })
      .expect(201);

    expect(res.body.skipped).toBe(1);
    expect(res.body.skippedDetails).toHaveLength(1);
    expect(res.body.skippedDetails[0].existingLeadId).toBe(existingLead.id);
  });
});
