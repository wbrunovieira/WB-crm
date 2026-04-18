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

let adminToken: string;
let sdrToken: string;
let adminId: string;
let sdrId: string;
let leadId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: "e2e-shared-admin@test.com" },
    update: {},
    create: { email: "e2e-shared-admin@test.com", name: "E2E Admin", password: "hashed", role: "admin" },
  });
  adminId = admin.id;
  adminToken = jwt.sign({ sub: admin.id, name: admin.name, email: admin.email, role: admin.role });

  // Create SDR user
  const sdr = await prisma.user.upsert({
    where: { email: "e2e-shared-sdr@test.com" },
    update: {},
    create: { email: "e2e-shared-sdr@test.com", name: "E2E SDR", password: "hashed", role: "sdr" },
  });
  sdrId = sdr.id;
  sdrToken = jwt.sign({ sub: sdr.id, name: sdr.name, email: sdr.email, role: sdr.role });

  // Create a lead owned by admin
  const lead = await prisma.lead.create({
    data: {
      businessName: "Shared Lead Corp",
      ownerId: adminId,
      status: "new",
    },
  });
  leadId = lead.id;
});

afterEach(async () => {
  await prisma.sharedEntity.deleteMany({
    where: { OR: [{ sharedByUserId: adminId }, { sharedWithUserId: sdrId }] },
  });
});

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { ownerId: adminId } });
  await prisma.sharedEntity.deleteMany({
    where: { OR: [{ sharedByUserId: adminId }, { sharedWithUserId: sdrId }] },
  });
  await prisma.user.deleteMany({
    where: { email: { in: ["e2e-shared-admin@test.com", "e2e-shared-sdr@test.com"] } },
  });
  await app.close();
});

// ─── Auth guard ──────────────────────────────────────────────────────────────

describe("SharedEntities API — auth guard", () => {
  it("GET /shared-entities retorna 401 sem token", async () => {
    await request(app.getHttpServer())
      .get("/shared-entities")
      .query({ entityType: "lead", entityId: leadId })
      .expect(401);
  });

  it("POST /shared-entities retorna 401 sem token", async () => {
    await request(app.getHttpServer())
      .post("/shared-entities")
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(401);
  });

  it("DELETE /shared-entities/:id retorna 401 sem token", async () => {
    await request(app.getHttpServer()).delete("/shared-entities/any-id").expect(401);
  });

  it("PATCH /shared-entities/transfer retorna 401 sem token", async () => {
    await request(app.getHttpServer())
      .patch("/shared-entities/transfer")
      .send({ entityType: "lead", entityId: leadId, newOwnerId: sdrId })
      .expect(401);
  });
});

// ─── POST /shared-entities ───────────────────────────────────────────────────

describe("POST /shared-entities", () => {
  it("admin compartilha lead com SDR com sucesso", async () => {
    const res = await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(201);

    expect(res.body).toMatchObject({
      entityType: "lead",
      entityId: leadId,
      sharedWithUserId: sdrId,
    });
    expect(res.body.id).toBeDefined();
  });

  it("não-admin não pode compartilhar (422)", async () => {
    const res = await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${sdrToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: adminId })
      .expect(422);

    expect(res.body.message).toContain("administradores");
  });

  it("tipo de entidade inválido retorna 422", async () => {
    await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "invalid-type", entityId: leadId, sharedWithUserId: sdrId })
      .expect(422);
  });

  it("não pode compartilhar consigo mesmo (422)", async () => {
    const res = await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: adminId })
      .expect(422);

    expect(res.body.message).toContain("próprio usuário");
  });

  it("compartilhamento duplicado retorna 422", async () => {
    await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(201);

    const res = await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(422);

    expect(res.body.message).toContain("já compartilhada");
  });
});

// ─── GET /shared-entities ────────────────────────────────────────────────────

describe("GET /shared-entities", () => {
  it("admin lista compartilhamentos de um lead", async () => {
    // Share first
    await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ entityType: "lead", entityId: leadId })
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ userId: sdrId });
  });

  it("lista vazia quando não há compartilhamentos", async () => {
    const res = await request(app.getHttpServer())
      .get("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ entityType: "lead", entityId: "lead-sem-shares" })
      .expect(200);

    expect(res.body).toBeInstanceOf(Array);
    expect(res.body).toHaveLength(0);
  });

  it("não-admin não pode listar compartilhamentos (422)", async () => {
    await request(app.getHttpServer())
      .get("/shared-entities")
      .set("Authorization", `Bearer ${sdrToken}`)
      .query({ entityType: "lead", entityId: leadId })
      .expect(422);
  });
});

// ─── DELETE /shared-entities/:id ─────────────────────────────────────────────

describe("DELETE /shared-entities/:id", () => {
  it("admin remove compartilhamento com sucesso", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(201);

    const shareId = createRes.body.id;

    await request(app.getHttpServer())
      .delete(`/shared-entities/${shareId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(204);

    // Confirm gone
    const listRes = await request(app.getHttpServer())
      .get("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .query({ entityType: "lead", entityId: leadId })
      .expect(200);
    expect(listRes.body).toHaveLength(0);
  });

  it("não-admin não pode remover (422)", async () => {
    await request(app.getHttpServer())
      .delete("/shared-entities/any-id")
      .set("Authorization", `Bearer ${sdrToken}`)
      .expect(422);
  });

  it("share inexistente retorna 404", async () => {
    await request(app.getHttpServer())
      .delete("/shared-entities/id-nao-existe")
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(404);
  });
});

// ─── PATCH /shared-entities/transfer ─────────────────────────────────────────

describe("PATCH /shared-entities/transfer", () => {
  it("admin transfere ownership e remove shares", async () => {
    // Share first
    await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch("/shared-entities/transfer")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, newOwnerId: sdrId })
      .expect(200);

    expect(res.body).toMatchObject({ ok: true });

    // Lead ownerId should be updated
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    expect(lead?.ownerId).toBe(sdrId);

    // Shares should be removed
    const shares = await prisma.sharedEntity.findMany({
      where: { entityType: "lead", entityId: leadId },
    });
    expect(shares).toHaveLength(0);

    // Restore ownership for subsequent tests
    await prisma.lead.update({ where: { id: leadId }, data: { ownerId: adminId } });
  });

  it("não-admin não pode transferir (422)", async () => {
    const res = await request(app.getHttpServer())
      .patch("/shared-entities/transfer")
      .set("Authorization", `Bearer ${sdrToken}`)
      .send({ entityType: "lead", entityId: leadId, newOwnerId: adminId })
      .expect(422);

    expect(res.body.message).toContain("administradores");
  });

  it("tipo inválido retorna 422", async () => {
    await request(app.getHttpServer())
      .patch("/shared-entities/transfer")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "invalid", entityId: "x", newOwnerId: "y" })
      .expect(422);
  });
});

// ─── Access control integration ───────────────────────────────────────────────

describe("Acesso a lead via share (integração)", () => {
  it("SDR não acessa lead de outro usuário sem share", async () => {
    await request(app.getHttpServer())
      .get(`/leads/${leadId}`)
      .set("Authorization", `Bearer ${sdrToken}`)
      .expect(404);
  });

  it("SDR acessa lead após share do admin", async () => {
    await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/leads/${leadId}`)
      .set("Authorization", `Bearer ${sdrToken}`)
      .expect(200);
  });

  it("SDR perde acesso após remoção do share", async () => {
    const createRes = await request(app.getHttpServer())
      .post("/shared-entities")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ entityType: "lead", entityId: leadId, sharedWithUserId: sdrId })
      .expect(201);

    const shareId = createRes.body.id;

    // SDR has access
    await request(app.getHttpServer())
      .get(`/leads/${leadId}`)
      .set("Authorization", `Bearer ${sdrToken}`)
      .expect(200);

    // Admin removes share
    await request(app.getHttpServer())
      .delete(`/shared-entities/${shareId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(204);

    // SDR loses access
    await request(app.getHttpServer())
      .get(`/leads/${leadId}`)
      .set("Authorization", `Bearer ${sdrToken}`)
      .expect(404);
  });
});
