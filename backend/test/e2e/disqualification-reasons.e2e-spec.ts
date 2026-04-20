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
    where: { email: "e2e-disq@test.com" },
    update: {},
    create: { email: "e2e-disq@test.com", name: "E2E Disq User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.disqualificationReason.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-disq@test.com" } });
  await app.close();
});

describe("GET /disqualification-reasons (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).get("/disqualification-reasons").expect(401);
  });

  it("retorna lista vazia inicialmente", async () => {
    const res = await request(app.getHttpServer())
      .get("/disqualification-reasons")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("POST /disqualification-reasons (e2e)", () => {
  it("cria um motivo", async () => {
    const res = await request(app.getHttpServer())
      .post("/disqualification-reasons")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Sem budget" })
      .expect(201);
    expect(res.body.name).toBe("Sem budget");
    expect(res.body.id).toBeDefined();
  });

  it("rejeita nome vazio", async () => {
    await request(app.getHttpServer())
      .post("/disqualification-reasons")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "" })
      .expect(422);
  });

  it("rejeita nome duplicado", async () => {
    await request(app.getHttpServer())
      .post("/disqualification-reasons")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Duplicado" })
      .expect(201);

    await request(app.getHttpServer())
      .post("/disqualification-reasons")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Duplicado" })
      .expect(409);
  });
});

describe("DELETE /disqualification-reasons/:id (e2e)", () => {
  it("deleta um motivo", async () => {
    const created = await request(app.getHttpServer())
      .post("/disqualification-reasons")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Deletar" })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/disqualification-reasons/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const list = await request(app.getHttpServer())
      .get("/disqualification-reasons")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(list.body).toHaveLength(0);
  });

  it("retorna 404 para id inexistente", async () => {
    await request(app.getHttpServer())
      .delete("/disqualification-reasons/nonexistent")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });
});
