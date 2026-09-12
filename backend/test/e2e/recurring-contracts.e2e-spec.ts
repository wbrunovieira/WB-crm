/**
 * Contratos recorrentes pela HTTP real.
 *
 * Os unitários provam as regras; este prova que as rotas existem, que o Nest resolve o módulo
 * novo e — o que mais importa — que os DOIS totais chegam certos na resposta. Confundi-los
 * engana nos dois sentidos: falar só a hospedagem ao cliente cobra a menos; contar o domínio
 * como receita faz a recorrência parecer maior do que é.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

const EMAIL = "e2e-recurring@test.com";

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let ownerId: string;
let orgId: string;

async function limpar() {
  await prisma.recurringContract.deleteMany({ where: { ownerId } });
  await prisma.organization.deleteMany({ where: { ownerId } });
}

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: {},
    create: { email: EMAIL, name: "E2E Recorrente", password: "hashed", role: "admin" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
  await limpar();
});

beforeEach(async () => {
  await limpar();
  const org = await prisma.organization.create({
    data: { ownerId, name: `E2E Recorrente ${Date.now()}` },
  });
  orgId = org.id;
});

afterAll(async () => {
  await limpar();
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  await app.close();
});

const auth = (r: request.Test) => r.set("Authorization", `Bearer ${token}`);
const criar = (body: Record<string, unknown>) =>
  auth(request(app.getHttpServer()).post(`/organizations/${orgId}/recurring-contracts`).send(body));
const listar = () =>
  auth(request(app.getHttpServer()).get(`/organizations/${orgId}/recurring-contracts`));

describe("contratos recorrentes (e2e)", () => {
  it("cria hospedagem e domínio e devolve os dois totais", async () => {
    await criar({ type: "hospedagem", value: 128, cycle: "anual" }).expect(201);
    await criar({ type: "dominio", value: 40, cycle: "anual" }).expect(201);

    const res = await listar().expect(200);

    expect(res.body.contracts).toHaveLength(2);
    expect(res.body.totais.cobradoAnual).toBe(168);
    expect(res.body.totais.receitaAnual).toBe(128);
    expect(res.body.totais.repasseAnual).toBe(40);
  });

  it("marca domínio como repasse sem ninguém pedir", async () => {
    await criar({ type: "dominio", value: 40, cycle: "anual" }).expect(201);
    const res = await listar().expect(200);
    expect(res.body.contracts[0].isPassThrough).toBe(true);
  });

  it("cliente que paga o domínio direto: os dois totais coincidem", async () => {
    await criar({ type: "hospedagem", value: 128, cycle: "anual" }).expect(201);
    const res = await listar().expect(200);
    expect(res.body.totais.cobradoAnual).toBe(128);
    expect(res.body.totais.receitaAnual).toBe(128);
  });

  it("soma mensal com anual", async () => {
    await criar({ type: "hospedagem", value: 128, cycle: "anual" }).expect(201);
    await criar({ type: "servidor", value: 235, cycle: "mensal" }).expect(201);
    const res = await listar().expect(200);
    expect(res.body.totais.receitaAnual).toBeCloseTo(128 + 235 * 12, 2);
  });

  it("cortesia fica fora dos dois totais mas continua na lista", async () => {
    await criar({ type: "hospedagem", value: 0, cycle: "anual", isCourtesy: true }).expect(201);
    const res = await listar().expect(200);
    expect(res.body.contracts).toHaveLength(1);
    expect(res.body.contracts[0].isCourtesy).toBe(true);
    expect(res.body.totais.cobradoAnual).toBe(0);
  });

  it("todo campo enviado precisa VOLTAR na leitura", async () => {
    const enviado = {
      type: "servidor", label: "Loja online", value: 235, cycle: "mensal",
      nextChargeAt: "2026-10-12T00:00:00.000Z", autoRenew: true, remindDays: 45, notes: "IPCA após 12 meses",
    };
    await criar(enviado).expect(201);

    const res = await listar().expect(200);
    const c = res.body.contracts[0];
    expect(c.label).toBe("Loja online");
    expect(c.value).toBe(235);
    expect(c.cycle).toBe("mensal");
    expect(c.remindDays).toBe(45);
    expect(c.notes).toBe("IPCA após 12 meses");
    expect(new Date(c.nextChargeAt).toISOString()).toBe(enviado.nextChargeAt);
  });

  it("edita e apaga", async () => {
    const criado = await criar({ type: "hospedagem", value: 128, cycle: "anual" }).expect(201);
    const id = criado.body.id;

    await auth(request(app.getHttpServer()).patch(`/recurring-contracts/${id}`).send({ value: 168 })).expect(200);
    expect((await listar()).body.totais.cobradoAnual).toBe(168);

    await auth(request(app.getHttpServer()).delete(`/recurring-contracts/${id}`)).expect(204);
    expect((await listar()).body.contracts).toHaveLength(0);
  });

  it("recusa tipo e ciclo inválidos", async () => {
    await criar({ type: "inventado", value: 10, cycle: "anual" }).expect(422);
    await criar({ type: "hospedagem", value: 10, cycle: "semanal" }).expect(422);
  });

  it("exige autenticação", async () => {
    await request(app.getHttpServer())
      .get(`/organizations/${orgId}/recurring-contracts`)
      .expect(401);
  });
});
