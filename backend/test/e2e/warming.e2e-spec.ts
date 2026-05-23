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
let userId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-warming@test.com" },
    update: {},
    create: {
      email: "e2e-warming@test.com",
      name: "E2E Warming User",
      password: "hashed",
      role: "admin",
    },
  });
  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.warmingSend.deleteMany({ where: { warmingAccount: { ownerId: userId } } });
  await prisma.warmingAccount.deleteMany({ where: { ownerId: userId } });
  await prisma.warmingPoolEmail.deleteMany({ where: { ownerId: userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-warming@test.com" } });
  await app.close();
});

describe("Warming API (e2e)", () => {

  describe("GET /warming/status", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/warming/status").expect(401);
    });

    it("retorna status vazio quando sem contas", async () => {
      const res = await request(app.getHttpServer())
        .get("/warming/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.accounts).toEqual([]);
    });
  });

  describe("POST /warming/accounts", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).post("/warming/accounts").expect(401);
    });

    it("adiciona conta de aquecimento", async () => {
      const res = await request(app.getHttpServer())
        .post("/warming/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "test-warming@gmail.com" })
        .expect(201);

      expect(res.body.email).toBe("test-warming@gmail.com");
      expect(res.body.id).toBeTruthy();
    });

    it("retorna 409 ao adicionar email duplicado", async () => {
      await request(app.getHttpServer())
        .post("/warming/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "dup@gmail.com" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/warming/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "dup@gmail.com" })
        .expect(409);
    });
  });

  describe("DELETE /warming/accounts/:id", () => {
    it("remove conta existente", async () => {
      const create = await request(app.getHttpServer())
        .post("/warming/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "to-delete@gmail.com" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/warming/accounts/${create.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const status = await request(app.getHttpServer())
        .get("/warming/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(status.body.accounts).toHaveLength(0);
    });

    it("retorna 404 para id inexistente", async () => {
      await request(app.getHttpServer())
        .delete("/warming/accounts/non-existent-id")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  describe("POST /warming/pool", () => {
    it("adiciona email ao pool externo", async () => {
      const res = await request(app.getHttpServer())
        .post("/warming/pool")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "friend@gmail.com", name: "João" })
        .expect(201);

      expect(res.body.email).toBe("friend@gmail.com");
    });

    it("retorna 409 ao adicionar email duplicado no pool", async () => {
      await request(app.getHttpServer())
        .post("/warming/pool")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "dup-pool@gmail.com" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/warming/pool")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "dup-pool@gmail.com" })
        .expect(409);
    });
  });

  describe("GET /warming/pool", () => {
    it("lista emails do pool", async () => {
      await request(app.getHttpServer())
        .post("/warming/pool")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "p1@gmail.com", name: "P1" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/warming/pool")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "p2@gmail.com" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/warming/pool")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].email).toBeTruthy();
    });
  });

  describe("DELETE /warming/pool/:id", () => {
    it("remove email do pool", async () => {
      const create = await request(app.getHttpServer())
        .post("/warming/pool")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "del-pool@gmail.com" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/warming/pool/${create.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);
    });
  });

  describe("GET /warming/status — com contas", () => {
    it("mostra conta com volume diário correto (dia 0 = 10)", async () => {
      await request(app.getHttpServer())
        .post("/warming/accounts")
        .set("Authorization", `Bearer ${token}`)
        .send({ email: "vol-check@gmail.com" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/warming/status")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.accounts).toHaveLength(1);
      expect(res.body.accounts[0].dailyVolume).toBe(10);
      expect(res.body.accounts[0].phase).toBe("ramping");
      expect(res.body.accounts[0].todaySentCount).toBe(0);
    });
  });
});
