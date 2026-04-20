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
    where: { email: "e2e-operations@test.com" },
    update: {},
    create: { email: "e2e-operations@test.com", name: "E2E Operations User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-operations@test.com" } });
  await app.close();
});

describe("PATCH /operations/transfer (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).patch("/operations/transfer").send({ entityType: "lead", entityId: "x" }).expect(401);
  });

  it("retorna 422 para tipo inválido", async () => {
    await request(app.getHttpServer())
      .patch("/operations/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ entityType: "contact", entityId: "x" })
      .expect(422);
  });

  it("retorna 404 para lead inexistente", async () => {
    await request(app.getHttpServer())
      .patch("/operations/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ entityType: "lead", entityId: "nonexistent" })
      .expect(404);
  });

  it("transfere lead para operações", async () => {
    const lead = await prisma.lead.create({ data: { ownerId, businessName: "Test Lead", status: "new" } });

    const res = await request(app.getHttpServer())
      .patch("/operations/transfer")
      .set("Authorization", `Bearer ${token}`)
      .send({ entityType: "lead", entityId: lead.id })
      .expect(200);

    expect(res.body.transferredAt).toBeDefined();

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updated!.inOperationsAt).not.toBeNull();
  });
});

describe("PATCH /operations/revert (e2e)", () => {
  it("reverte lead de operações", async () => {
    const lead = await prisma.lead.create({ data: { ownerId, businessName: "Op Lead", status: "new", inOperationsAt: new Date() } });

    await request(app.getHttpServer())
      .patch("/operations/revert")
      .set("Authorization", `Bearer ${token}`)
      .send({ entityType: "lead", entityId: lead.id })
      .expect(200);

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updated!.inOperationsAt).toBeNull();
  });
});
