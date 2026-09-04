/**
 * Contrato de ida e volta: todo campo que a API aceita gravar TEM de voltar na leitura.
 *
 * Esta suíte existe por causa de uma família inteira de bugs encontrada em 03-04/09/2026, em
 * que o dado era gravado corretamente e a leitura o descartava — ou o contrário. Nenhum deles
 * dava erro: a resposta do POST/PATCH ecoava o valor a partir da entidade em memória, e só o
 * GET seguinte revelava o problema. Os testes existentes não pegaram porque verificavam o
 * campo que cada correção mexia, nunca o contrato inteiro.
 *
 * O que teria sido pego aqui:
 *   - Activity.remindAt   — gravado no banco (174 registros), ausente dos read-models: o sino
 *                           disparava, mas a tela dizia que não havia lembrete.
 *   - Organization.segment/legalNature/... — colunas existentes, fora do read-model.
 *   - Deal.stage na organização — renderizado na tela, nunca selecionado na query.
 *   - Contact.languages   — passado ao componente, ausente do payload.
 *
 * REGRA: ao adicionar um campo persistido a uma entidade, acrescente-o ao caso dela aqui.
 * Se o campo não voltar do GET, ele não existe para quem usa o sistema.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let ownerId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-roundtrip@test.com" },
    update: {},
    create: { email: "e2e-roundtrip@test.com", name: "E2E Roundtrip", password: "hashed", role: "admin" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  // Self-clean no INÍCIO: o banco de dev é compartilhado e uma execução anterior que morreu
  // no meio deixa lixo que contamina a primeira asserção.
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.organization.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterEach(async () => {
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.organization.deleteMany({ where: { ownerId } });
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-roundtrip@test.com" } });
  await app.close();
});

/** Compara o que voltou com o que foi enviado, tratando datas por valor e não por formatação. */
function expectRoundTrip(sent: Record<string, unknown>, got: Record<string, unknown>, label: string) {
  const missing: string[] = [];
  const wrong: string[] = [];

  for (const [field, sentValue] of Object.entries(sent)) {
    if (!(field in got)) {
      missing.push(field);
      continue;
    }
    const gotValue = got[field];
    const isDate = typeof sentValue === "string" && /^\d{4}-\d{2}-\d{2}T/.test(sentValue);
    const equal = isDate
      ? gotValue != null && new Date(gotValue as string).toISOString() === new Date(sentValue).toISOString()
      : JSON.stringify(gotValue) === JSON.stringify(sentValue);
    if (!equal) wrong.push(`${field}: enviei ${JSON.stringify(sentValue)}, voltou ${JSON.stringify(gotValue)}`);
  }

  expect(
    { ausentesNaResposta: missing, valoresDivergentes: wrong },
    `${label}: campos que não sobreviveram ao GET`,
  ).toEqual({ ausentesNaResposta: [], valoresDivergentes: [] });
}

describe("Contrato de ida e volta dos campos (e2e)", () => {
  describe("Activity", () => {
    // Todos os campos de data da Activity de uma vez: foi um deles (remindAt) que sumiu na
    // leitura sem ninguém perceber por semanas.
    const campos = {
      subject: "Atividade round-trip",
      description: "Descrição que precisa voltar",
      type: "task",
      dueDate: "2026-10-15T12:00:00.000Z",
      remindAt: "2026-10-15T11:00:00.000Z",
      scheduledSendAt: "2026-10-16T08:00:00.000Z",
    };

    it("POST → GET por id devolve todos os campos gravados", async () => {
      const created = await request(app.getHttpServer())
        .post("/activities").set("Authorization", `Bearer ${token}`)
        .send(campos).expect(201);

      const res = await request(app.getHttpServer())
        .get(`/activities/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .expect(200);

      expectRoundTrip(campos, res.body, "Activity (detalhe)");
    });

    it("POST → GET da listagem devolve os mesmos campos", async () => {
      // A listagem tem read-model próprio: um campo pode voltar no detalhe e sumir aqui, que
      // foi exatamente o caso do remindAt (a chave nem existia na lista).
      const created = await request(app.getHttpServer())
        .post("/activities").set("Authorization", `Bearer ${token}`)
        .send(campos).expect(201);

      const list = await request(app.getHttpServer())
        .get("/activities?owner=mine").set("Authorization", `Bearer ${token}`)
        .expect(200);

      const row = list.body.find((a: { id: string }) => a.id === created.body.id);
      expect(row, "atividade recém-criada não apareceu na listagem").toBeDefined();
      expectRoundTrip(campos, row, "Activity (listagem)");
    });

    it("PATCH → GET devolve o que foi alterado", async () => {
      // scheduledSendAt fica de fora de propósito: ele é espelho do fluxo de e-mail agendado
      // (modelo ScheduledEmailSend e endpoints do módulo de e-mail), definido na criação e
      // reagendado por lá — o PATCH genérico de atividade não o aceita, e isso é desenho, não
      // lacuna. A primeira versão deste teste o incluía e falhou: um contrato que ninguém
      // prometeu. Ficou registrado para não ser "corrigido" no futuro.
      const { scheduledSendAt: _naoEditavelPorAqui, ...camposEditaveis } = campos;

      const created = await request(app.getHttpServer())
        .post("/activities").set("Authorization", `Bearer ${token}`)
        .send({ type: "task", subject: "Antes do PATCH" }).expect(201);

      await request(app.getHttpServer())
        .patch(`/activities/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send(camposEditaveis).expect(200);

      const res = await request(app.getHttpServer())
        .get(`/activities/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .expect(200);

      expectRoundTrip(camposEditaveis, res.body, "Activity (após PATCH)");
    });
  });

  describe("Organization", () => {
    const campos = {
      name: "Org Round-trip E2E",
      legalName: "Org Round-trip Ltda",
      foundationDate: "2020-01-15T00:00:00.000Z",
      phone2: "+552133334444",
      segment: "Panificação",
      legalNature: "Sociedade Empresária Limitada",
      branchType: "Matriz",
      simplesNacional: true,
      isMei: false,
      revenueRange: "1M-5M",
      sourceGroup: "porta-a-porta",
      employeeCount: 42,
      companyOwner: "Fulano de Tal",
      companySize: "pequena",
      hasHosting: true,
      hostingRenewalDate: "2027-08-25T00:00:00.000Z",
      hostingPlan: "Básico",
      tiktok: "@orgroundtrip",
    };

    it("POST → GET por id devolve todos os campos gravados", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations").set("Authorization", `Bearer ${token}`)
        .send(campos).expect(201);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .expect(200);

      expectRoundTrip(campos, res.body, "Organization (detalhe)");
    });

    it("PATCH parcial preserva tudo o que não foi mencionado", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations").set("Authorization", `Bearer ${token}`)
        .send(campos).expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ city: "Petrópolis" }).expect(200);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.city).toBe("Petrópolis");
      expectRoundTrip(campos, res.body, "Organization (após PATCH parcial)");
    });
  });

  describe("Lead", () => {
    const campos = {
      businessName: "Lead Round-trip E2E",
      registeredName: "Lead Round-trip Ltda",
      foundationDate: "2019-06-10T00:00:00.000Z",
      phone2: "+552199998888",
      segment: "Artesanato",
      legalNature: "MEI",
      revenueRange: "até 360 mil",
      sourceGroup: "porta-a-porta",
      employeesCount: 7,
      latitude: -22.5089,
      longitude: -43.1789,
    };

    it("POST → GET por id devolve todos os campos gravados", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads").set("Authorization", `Bearer ${token}`)
        .send(campos).expect(201);

      const res = await request(app.getHttpServer())
        .get(`/leads/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .expect(200);

      expectRoundTrip(campos, res.body, "Lead (detalhe)");
    });

    it("PATCH parcial preserva tudo o que não foi mencionado", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads").set("Authorization", `Bearer ${token}`)
        .send(campos).expect(201);

      await request(app.getHttpServer())
        .patch(`/leads/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ city: "Petrópolis" }).expect(200);

      const res = await request(app.getHttpServer())
        .get(`/leads/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.city).toBe("Petrópolis");
      expectRoundTrip(campos, res.body, "Lead (após PATCH parcial)");
    });
  });
});
