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
let labelId: string;

const ALL_FIELDS_PAYLOAD = {
  name: "Tech Corp Ltda",
  legalName: "Tech Corp Comércio e Serviços Ltda",
  foundationDate: "2010-03-15",
  website: "https://techcorp.com.br",
  phone: "+5511999999999",
  whatsapp: "+5511988888888",
  email: "contato@techcorp.com.br",
  country: "Brasil",
  state: "SP",
  city: "São Paulo",
  zipCode: "01310-100",
  streetAddress: "Rua das Flores, 123",
  industry: "Tecnologia da Informação",
  employeeCount: 50,
  annualRevenue: 1500000,
  taxId: "12.345.678/0001-99",
  description: "Empresa de tecnologia focada em soluções web",
  companyOwner: "João Silva",
  companySize: "média",
  languages: JSON.stringify([{ code: "pt-BR", isPrimary: true }, { code: "en", isPrimary: false }]),
  internationalActivity: "Exportação para América Latina",
  instagram: "@techcorp",
  linkedin: "https://linkedin.com/company/techcorp",
  facebook: "https://facebook.com/techcorp",
  twitter: "@techcorp",
  tiktok: "@techcorp_br",
  externalProjectIds: JSON.stringify(["proj-001", "proj-002"]),
  driveFolderId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
  hasHosting: true,
  hostingRenewalDate: "2025-12-31",
  hostingPlan: "Profissional",
  hostingValue: 1200.0,
  hostingReminderDays: 15,
  hostingNotes: "Renovar em dezembro — cliente confirma no começo do mês",
  inOperationsAt: "2024-01-15",
};

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-organizations@test.com" },
    update: {},
    create: {
      email: "e2e-organizations@test.com",
      name: "E2E Organizations User",
      password: "hashed",
      role: "sdr",
    },
  });
  ownerId = user.id;

  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  const label = await prisma.label.upsert({
    where: { name_ownerId: { name: "E2E Label Org", ownerId: user.id } },
    update: {},
    create: { name: "E2E Label Org", color: "#FF0000", ownerId: user.id },
  });
  labelId = label.id;
});

afterEach(async () => {
  await prisma.organization.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.label.deleteMany({ where: { ownerId } });
  await prisma.user.deleteMany({ where: { email: "e2e-organizations@test.com" } });
  await app.close();
});

describe("Organizations API (e2e)", () => {

  // ─── GET /organizations ────────────────────────────────────────────────────

  describe("GET /organizations", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/organizations").expect(401);
    });

    it("retorna lista vazia quando não há organizações", async () => {
      const res = await request(app.getHttpServer())
        .get("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });

    it("retorna organizações com campos de relação presentes", async () => {
      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Relações E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      const item = res.body[0];
      expect(item).toHaveProperty("owner");
      expect(item).toHaveProperty("labels");
      expect(item).toHaveProperty("_count");
      expect(item.labels).toBeInstanceOf(Array);
      expect(item._count).toHaveProperty("contacts");
      expect(item._count).toHaveProperty("deals");
    });

    it("filtra por search no nome", async () => {
      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BuscaEspecifica Corp" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Outra Empresa SA" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/organizations?search=BuscaEspecifica")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((o: { name: string }) => o.name.includes("BuscaEspecifica"))).toBe(true);
    });

    it("filtra por hasHosting=true", async () => {
      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Com Hosting", hasHosting: true })
        .expect(201);

      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Sem Hosting" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/organizations?hasHosting=true")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((o: { hasHosting: boolean }) => o.hasHosting === true)).toBe(true);
    });
  });

  // ─── POST /organizations ───────────────────────────────────────────────────

  describe("POST /organizations", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer())
        .post("/organizations")
        .send({ name: "Org Sem Token" })
        .expect(401);
    });

    it("cria organização com dados mínimos", async () => {
      const res = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Mínima E2E" })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Org Mínima E2E");
      expect(res.body.ownerId).toBe(ownerId);
      expect(res.body.hasHosting).toBe(false);
      expect(res.body.hostingReminderDays).toBe(30);
    });

    it("cria organização com todos os campos", async () => {
      const res = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send(ALL_FIELDS_PAYLOAD)
        .expect(201);

      expect(res.body.name).toBe("Tech Corp Ltda");
      expect(res.body.legalName).toBe("Tech Corp Comércio e Serviços Ltda");
      expect(res.body.taxId).toBe("12.345.678/0001-99");
      expect(res.body.hasHosting).toBe(true);
      expect(res.body.hostingPlan).toBe("Profissional");
      expect(res.body.hostingValue).toBe(1200);
      expect(res.body.hostingReminderDays).toBe(15);
      expect(res.body.city).toBe("São Paulo");
      expect(res.body.state).toBe("SP");
      expect(res.body.employeeCount).toBe(50);
      expect(res.body.annualRevenue).toBe(1500000);
      expect(res.body.instagram).toBe("@techcorp");
      expect(res.body.linkedin).toBe("https://linkedin.com/company/techcorp");
      // DateTime fields should be present
      expect(res.body.foundationDate).toBeTruthy();
      expect(res.body.hostingRenewalDate).toBeTruthy();
      expect(res.body.inOperationsAt).toBeTruthy();
      // JSON fields
      expect(res.body.languages).toBeTruthy();
      expect(res.body.externalProjectIds).toBeTruthy();
    });

    it("retorna erro quando nome está ausente", async () => {
      await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ city: "São Paulo" })
        .expect(500);
    });

    it("cria organização com labelIds e GET retorna labels", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Com Label E2E", labelIds: [labelId] })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.labels).toBeInstanceOf(Array);
      expect(res.body.labels.length).toBe(1);
      expect(res.body.labels[0].id).toBe(labelId);
      expect(res.body.labels[0].name).toBe("E2E Label Org");
    });

    it("cria organização com labelIds vazios sem erro", async () => {
      const res = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Sem Labels E2E", labelIds: [] })
        .expect(201);

      expect(res.body).toHaveProperty("id");
    });
  });

  // ─── GET /organizations/:id ────────────────────────────────────────────────

  describe("GET /organizations/:id", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/organizations/qualquer-id").expect(401);
    });

    it("retorna organização com relações completas", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Detalhe E2E", city: "Curitiba" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.name).toBe("Org Detalhe E2E");
      expect(res.body.city).toBe("Curitiba");
      expect(res.body).toHaveProperty("contacts");
      expect(res.body).toHaveProperty("deals");
      expect(res.body).toHaveProperty("secondaryCNAEs");
      expect(res.body).toHaveProperty("techProfile");
      expect(res.body.contacts).toBeInstanceOf(Array);
      expect(res.body.deals).toBeInstanceOf(Array);
    });

    it("retorna 404 quando organização não existe", async () => {
      await request(app.getHttpServer())
        .get("/organizations/id-inexistente-123")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── PATCH /organizations/:id ──────────────────────────────────────────────

  describe("PATCH /organizations/:id", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).patch("/organizations/qualquer-id").send({ name: "X" }).expect(401);
    });

    it("atualiza organização existente", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Original E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Org Atualizada E2E",
          city: "Belo Horizonte",
          hasHosting: true,
          hostingPlan: "Básico",
          hostingValue: 800,
          hostingRenewalDate: "2026-06-30",
        })
        .expect(200);

      expect(res.body.name).toBe("Org Atualizada E2E");
      expect(res.body.city).toBe("Belo Horizonte");
      expect(res.body.hasHosting).toBe(true);
      expect(res.body.hostingPlan).toBe("Básico");
      expect(res.body.hostingValue).toBe(800);
      expect(res.body.hostingRenewalDate).toBeTruthy();
    });

    it("retorna 404 quando organização não existe", async () => {
      await request(app.getHttpServer())
        .patch("/organizations/id-inexistente-999")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Novo Nome" })
        .expect(404);
    });

    it("atualiza campos DateTime (foundationDate, inOperationsAt)", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Data E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          foundationDate: "2015-06-20",
          inOperationsAt: "2024-03-01",
        })
        .expect(200);

      expect(res.body.foundationDate).toBeTruthy();
      expect(res.body.inOperationsAt).toBeTruthy();
    });

    it("atualiza labelIds e GET retorna labels atualizadas", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Para Update Labels E2E" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ labelIds: [labelId] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.labels).toBeInstanceOf(Array);
      expect(res.body.labels.length).toBe(1);
      expect(res.body.labels[0].id).toBe(labelId);
    });

    it("limpa labels enviando labelIds vazio no update", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org Para Limpar Labels E2E", labelIds: [labelId] })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ labelIds: [] })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.labels).toBeInstanceOf(Array);
      expect(res.body.labels.length).toBe(0);
    });

    it("atualiza campos JSON (languages, externalProjectIds)", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org JSON E2E" })
        .expect(201);

      const langs = JSON.stringify([{ code: "pt-BR", isPrimary: true }]);
      const extProjs = JSON.stringify(["proj-A", "proj-B"]);

      const res = await request(app.getHttpServer())
        .patch(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ languages: langs, externalProjectIds: extProjs })
        .expect(200);

      expect(res.body.languages).toBe(langs);
      expect(res.body.externalProjectIds).toBe(extProjs);
    });
  });

  // ─── DELETE /organizations/:id ─────────────────────────────────────────────

  describe("DELETE /organizations/:id", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).delete("/organizations/qualquer-id").expect(401);
    });

    it("deleta organização existente e retorna 204", async () => {
      const created = await request(app.getHttpServer())
        .post("/organizations")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Org para Deletar E2E" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/organizations/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna 404 quando organização não existe", async () => {
      await request(app.getHttpServer())
        .delete("/organizations/id-inexistente-delete")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });
});
