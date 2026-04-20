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
let leadId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-proposals@test.com" },
    update: {},
    create: { email: "e2e-proposals@test.com", name: "E2E Proposals User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  const lead = await prisma.lead.create({ data: { businessName: "Lead Proposta", ownerId, status: "new" } });
  leadId = lead.id;
});

afterEach(async () => {
  await prisma.proposal.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { email: "e2e-proposals@test.com" } });
  await app.close();
});

describe("GET /proposals (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/proposals").expect(401);
  });

  it("retorna lista vazia inicialmente", async () => {
    const res = await request(app.getHttpServer())
      .get("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /proposals (e2e)", () => {
  it("cria proposta com status draft padrão", async () => {
    const res = await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Proposta Empresa Alpha" })
      .expect(201);

    expect(res.body.title).toBe("Proposta Empresa Alpha");
    expect(res.body.status).toBe("draft");
    expect(res.body.id).toBeDefined();
  });

  it("cria com todos os campos opcionais", async () => {
    const res = await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "Proposta Completa",
        description: "Proposta de desenvolvimento",
        status: "sent",
        driveFileId: "file123",
        driveUrl: "https://drive.google.com/file/d/123",
        fileName: "proposta.pdf",
        fileSize: 204800,
        leadId,
      })
      .expect(201);

    expect(res.body.status).toBe("sent");
    expect(res.body.driveFileId).toBe("file123");
    expect(res.body.fileName).toBe("proposta.pdf");
    expect(res.body.leadId).toBe(leadId);
    expect(res.body.sentAt).toBeDefined();
  });

  it("rejeita título vazio", async () => {
    await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "" })
      .expect(422);
  });

  it("rejeita status inválido", async () => {
    await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Test", status: "pending" })
      .expect(422);
  });
});

describe("PATCH /proposals/:id (e2e)", () => {
  it("atualiza status para sent e seta sentAt", async () => {
    const created = await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Draft Proposal" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/proposals/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "sent" })
      .expect(200);

    expect(res.body.status).toBe("sent");
    expect(res.body.sentAt).toBeDefined();
  });

  it("retorna 404 para id inexistente", async () => {
    await request(app.getHttpServer())
      .patch("/proposals/nonexistent")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "X" })
      .expect(404);
  });
});

describe("DELETE /proposals/:id (e2e)", () => {
  it("deleta uma proposta", async () => {
    const created = await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Para Deletar" })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/proposals/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const list = await request(app.getHttpServer())
      .get("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(0);
  });
});

describe("GET /proposals?leadId= (e2e)", () => {
  it("filtra por leadId", async () => {
    await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Com Lead", leadId })
      .expect(201);

    await request(app.getHttpServer())
      .post("/proposals")
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Sem Lead" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/proposals?leadId=${leadId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].leadId).toBe(leadId);
  });
});
