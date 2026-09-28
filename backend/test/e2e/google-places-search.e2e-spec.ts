import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

let app: INestApplication;
let prisma: PrismaService;
let token: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-places@test.com" },
    update: {},
    create: { email: "e2e-places@test.com", name: "E2E Places User", password: "hashed", role: "admin" },
  });
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-places@test.com" } });
  await app.close();
});

const bearer = () => ({ Authorization: `Bearer ${token}` });

/**
 * A busca do Places aceitava corpo inválido e só descobria no Google, que respondia
 * "Empty text_query" — e o erro cru virava 500 "Internal server error" sem detalhe.
 * Um agente externo chamou com `query` em vez de `textQuery` e não teve como
 * diagnosticar: 500 diz "o servidor quebrou", quando quem errou foi o chamador.
 */
describe("POST /leads/google-places/search — validação de entrada (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer())
      .post("/leads/google-places/search")
      .send({ textQuery: "padaria em Petrópolis" })
      .expect(401);
  });

  it("retorna 400, e não 500, quando textQuery está ausente", async () => {
    const res = await request(app.getHttpServer())
      .post("/leads/google-places/search")
      .set(bearer())
      .send({})
      .expect(400);
    expect(res.body.message).toMatch(/textQuery/);
  });

  it("nomeia o campo certo quando o chamador usa `query` (erro real de um agente)", async () => {
    const res = await request(app.getHttpServer())
      .post("/leads/google-places/search")
      .set(bearer())
      .send({ query: "DIB Supermercados Petropolis RJ" })
      .expect(400);
    // A mensagem tem de dizer QUAL campo falta — é o que faltava para o chamador se corrigir.
    expect(res.body.message).toMatch(/textQuery/);
  });

  it("retorna 400 quando textQuery é só espaço em branco", async () => {
    await request(app.getHttpServer())
      .post("/leads/google-places/search")
      .set(bearer())
      .send({ textQuery: "   " })
      .expect(400);
  });

  it("retorna 400 quando textQuery não é string", async () => {
    await request(app.getHttpServer())
      .post("/leads/google-places/search")
      .set(bearer())
      .send({ textQuery: 42 })
      .expect(400);
  });
});
