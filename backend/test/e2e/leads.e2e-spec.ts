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

const ALL_FIELDS_PAYLOAD = {
  businessName: "Tech Solutions Ltda",
  registeredName: "Tech Solutions Ltda ME",
  foundationDate: "2010-03-15",
  companyRegistrationID: "12.345.678/0001-99",
  address: "Rua das Flores, 123",
  city: "São Paulo",
  state: "SP",
  country: "Brasil",
  zipCode: "01310-100",
  phone: "+55 11 3456-7890",
  whatsapp: "+5511987654321",
  website: "https://techsolutions.com.br",
  email: "contato@techsolutions.com.br",
  instagram: "@techsolutions",
  linkedin: "linkedin.com/company/techsolutions",
  companyOwner: "João Silva",
  companySize: "11-50",
  revenue: 500000,
  employeesCount: 30,
  description: "Empresa de tecnologia focada em soluções web",
  quality: "warm",
  status: "contacted",
  starRating: 4,
  socialMedia: "artes_frequentes",
  metaAds: "sim",
  googleAds: "nao",
  source: "Indicação",
  languages: [{ code: "pt-BR", isPrimary: true }, { code: "en", isPrimary: false }],
  referredByPartnerId: null,
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
    where: { email: "e2e-leads@test.com" },
    update: {},
    create: {
      email: "e2e-leads@test.com",
      name: "E2E Leads User",
      password: "hashed",
      role: "sdr",
    },
  });
  ownerId = user.id;

  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.lead.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-leads@test.com" } });
  await app.close();
});

describe("Leads API (e2e)", () => {

  // ─── GET /leads ────────────────────────────────────────────────────────────

  describe("GET /leads", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/leads").expect(401);
    });

    it("retorna lista vazia quando não há leads", async () => {
      const res = await request(app.getHttpServer())
        .get("/leads")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });

    it("retorna leads com campos de relação presentes", async () => {
      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Empresa Relações E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/leads")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      const item = res.body[0];
      expect(item).toHaveProperty("owner");
      expect(item).toHaveProperty("labels");
      expect(item).toHaveProperty("referredByPartner");
      expect(item.labels).toBeInstanceOf(Array);
    });

    it("filtra por status", async () => {
      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Contactado", status: "contacted" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Novo" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/leads?status=contacted")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((l: { status: string }) => l.status === "contacted")).toBe(true);
    });

    it("filtra por quality", async () => {
      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Quente", quality: "hot" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Frio", quality: "cold" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/leads?quality=hot")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body.every((l: { quality: string }) => l.quality === "hot")).toBe(true);
    });

    it("filtra por search (businessName)", async () => {
      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Busca Especifica Ltda" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Outra Empresa SA" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/leads?search=Busca+Especifica")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].businessName).toContain("Busca Especifica");
    });

    it("filtra isArchived=false retorna apenas ativos", async () => {
      // Create an active lead
      await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Ativo Filtro" })
        .expect(201);

      // Create and archive another lead
      const archived = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Para Arquivar Filtro" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/leads/${archived.body.id}/archive`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Teste de filtro" })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get("/leads?isArchived=false")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.every((l: { isArchived: boolean }) => l.isArchived === false)).toBe(true);
      const ids = res.body.map((l: { id: string }) => l.id);
      expect(ids).not.toContain(archived.body.id);
    });
  });

  // ─── POST /leads ───────────────────────────────────────────────────────────

  describe("POST /leads", () => {
    it("cria lead com apenas businessName obrigatório", async () => {
      const res = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Mínimo E2E" })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.businessName).toBe("Lead Mínimo E2E");
      expect(res.body.ownerId).toBe(ownerId);
    });

    it("cria lead com TODOS os campos incluindo foundationDate no formato YYYY-MM-DD", async () => {
      const res = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send(ALL_FIELDS_PAYLOAD)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.businessName).toBe(ALL_FIELDS_PAYLOAD.businessName);
      expect(res.body.registeredName).toBe(ALL_FIELDS_PAYLOAD.registeredName);
      expect(res.body.city).toBe(ALL_FIELDS_PAYLOAD.city);
      expect(res.body.state).toBe(ALL_FIELDS_PAYLOAD.state);
      expect(res.body.country).toBe(ALL_FIELDS_PAYLOAD.country);
      expect(res.body.phone).toBe(ALL_FIELDS_PAYLOAD.phone);
      expect(res.body.whatsapp).toBe(ALL_FIELDS_PAYLOAD.whatsapp);
      expect(res.body.website).toBe(ALL_FIELDS_PAYLOAD.website);
      expect(res.body.email).toBe(ALL_FIELDS_PAYLOAD.email);
      expect(res.body.quality).toBe("warm");
      expect(res.body.status).toBe("contacted");
      expect(res.body.starRating).toBe(4);
      expect(res.body.ownerId).toBe(ownerId);

      // foundationDate: sent as "2010-03-15", must be persisted as valid DateTime
      expect(res.body.foundationDate).toBeDefined();
      expect(new Date(res.body.foundationDate).getFullYear()).toBe(2010);

      // languages: must be persisted as JSON array
      const langs = typeof res.body.languages === "string"
        ? JSON.parse(res.body.languages)
        : res.body.languages;
      expect(langs).toBeInstanceOf(Array);
      expect(langs.some((l: { code: string }) => l.code === "pt-BR")).toBe(true);
      expect(langs.some((l: { code: string }) => l.code === "en")).toBe(true);
    });

    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer())
        .post("/leads")
        .send({ businessName: "Sem Token" })
        .expect(401);
    });
  });

  // ─── GET /leads/:id ────────────────────────────────────────────────────────

  describe("GET /leads/:id", () => {
    it("retorna lead por id com relações completas", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Detalhado E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/leads/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.businessName).toBe("Lead Detalhado E2E");
      expect(res.body).toHaveProperty("owner");
      expect(res.body).toHaveProperty("labels");
      expect(res.body).toHaveProperty("leadContacts");
      expect(res.body).toHaveProperty("activities");
      expect(res.body).toHaveProperty("secondaryCNAEs");
      expect(res.body).toHaveProperty("techProfile");
      expect(res.body.leadContacts).toBeInstanceOf(Array);
      expect(res.body.activities).toBeInstanceOf(Array);
      expect(res.body.secondaryCNAEs).toBeInstanceOf(Array);
    });

    it("retorna 404 para id inexistente", async () => {
      await request(app.getHttpServer())
        .get("/leads/id-que-nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── PATCH /leads/:id ─────────────────────────────────────────────────────

  describe("PATCH /leads/:id", () => {
    it("atualiza businessName do lead", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Original Nome" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/leads/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Nome Atualizado" })
        .expect(200);

      expect(res.body.businessName).toBe("Nome Atualizado");
    });

    it("atualiza todos os campos incluindo foundationDate no formato YYYY-MM-DD", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Antes da Atualização" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/leads/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          businessName: "Depois da Atualização",
          city: "Belo Horizonte",
          state: "MG",
          quality: "hot",
          status: "negotiating",
          starRating: 5,
          foundationDate: "1999-07-04",
          description: "Descrição atualizada",
        })
        .expect(200);

      expect(res.body.businessName).toBe("Depois da Atualização");
      expect(res.body.city).toBe("Belo Horizonte");
      expect(res.body.state).toBe("MG");
      expect(res.body.quality).toBe("hot");
      expect(res.body.status).toBe("negotiating");
      expect(res.body.starRating).toBe(5);
      expect(res.body.foundationDate).toBeDefined();
      expect(new Date(res.body.foundationDate).getFullYear()).toBe(1999);
    });

    it("retorna 404 ao atualizar id inexistente", async () => {
      await request(app.getHttpServer())
        .patch("/leads/id-que-nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Fantasma" })
        .expect(404);
    });
  });

  // ─── PATCH /leads/:id/archive ─────────────────────────────────────────────

  describe("PATCH /leads/:id/archive", () => {
    it("arquiva lead com motivo", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Para Arquivar" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/leads/${created.body.id}/archive`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Sem interesse" })
        .expect(200);

      expect(res.body.isArchived).toBe(true);
      expect(res.body.archivedReason).toBe("Sem interesse");
    });

    it("arquiva lead sem motivo", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Para Arquivar Sem Motivo" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/leads/${created.body.id}/archive`)
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(res.body.isArchived).toBe(true);
    });

    it("retorna 404 para lead inexistente", async () => {
      await request(app.getHttpServer())
        .patch("/leads/id-que-nao-existe/archive")
        .set("Authorization", `Bearer ${token}`)
        .send({})
        .expect(404);
    });
  });

  // ─── PATCH /leads/:id/unarchive ───────────────────────────────────────────

  describe("PATCH /leads/:id/unarchive", () => {
    it("desarquiva lead", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Para Desarquivar" })
        .expect(201);

      // Archive first
      await request(app.getHttpServer())
        .patch(`/leads/${created.body.id}/archive`)
        .set("Authorization", `Bearer ${token}`)
        .send({ reason: "Teste" })
        .expect(200);

      // Unarchive
      const res = await request(app.getHttpServer())
        .patch(`/leads/${created.body.id}/unarchive`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.isArchived).toBe(false);
    });
  });

  // ─── DELETE /leads/:id ────────────────────────────────────────────────────

  describe("DELETE /leads/:id", () => {
    it("deleta lead e retorna 404 na busca subsequente", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Para Deletar" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/leads/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/leads/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna 404 ao deletar id inexistente", async () => {
      await request(app.getHttpServer())
        .delete("/leads/id-que-nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("não aparece na listagem após deleção", async () => {
      const created = await request(app.getHttpServer())
        .post("/leads")
        .set("Authorization", `Bearer ${token}`)
        .send({ businessName: "Lead Sumindo da Lista" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/leads/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const list = await request(app.getHttpServer())
        .get("/leads")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const found = list.body.find((l: { id: string }) => l.id === created.body.id);
      expect(found).toBeUndefined();
    });
  });
});

// ─── Lead Contacts E2E ────────────────────────────────────────────────────────

describe("Lead Contacts E2E", () => {
  let leadId: string;

  beforeEach(async () => {
    const res = await request(app.getHttpServer())
      .post("/leads")
      .set("Authorization", `Bearer ${token}`)
      .send({ businessName: "Lead para Contatos E2E" })
      .expect(201);
    leadId = res.body.id;
  });

  it("POST /leads/:id/contacts — cria contato", async () => {
    const res = await request(app.getHttpServer())
      .post(`/leads/${leadId}/contacts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "João Contato", role: "CTO", email: "joao@empresa.com", isPrimary: true })
      .expect(201);

    expect(res.body.name).toBe("João Contato");
    expect(res.body.role).toBe("CTO");
    expect(res.body.isPrimary).toBe(true);
    expect(res.body.isActive).toBe(true);
  });

  it("GET /leads/:id/contacts — lista contatos", async () => {
    await request(app.getHttpServer())
      .post(`/leads/${leadId}/contacts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Contato Listagem" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/leads/${leadId}/contacts`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("PATCH /leads/:id/contacts/:contactId — atualiza contato", async () => {
    const created = await request(app.getHttpServer())
      .post(`/leads/${leadId}/contacts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Para Atualizar" })
      .expect(201);

    const res = await request(app.getHttpServer())
      .patch(`/leads/${leadId}/contacts/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Atualizado", role: "CEO" })
      .expect(200);

    expect(res.body.name).toBe("Atualizado");
    expect(res.body.role).toBe("CEO");
  });

  it("PATCH /leads/:id/contacts/:contactId/toggle — toggle isActive", async () => {
    const created = await request(app.getHttpServer())
      .post(`/leads/${leadId}/contacts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Toggle Test" })
      .expect(201);

    expect(created.body.isActive).toBe(true);

    const res = await request(app.getHttpServer())
      .patch(`/leads/${leadId}/contacts/${created.body.id}/toggle`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.isActive).toBe(false);
  });

  it("DELETE /leads/:id/contacts/:contactId — deleta contato", async () => {
    const created = await request(app.getHttpServer())
      .post(`/leads/${leadId}/contacts`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Para Deletar" })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/leads/${leadId}/contacts/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(204);

    const list = await request(app.getHttpServer())
      .get(`/leads/${leadId}/contacts`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(list.body.find((c: { id: string }) => c.id === created.body.id)).toBeUndefined();
  });
});

// ─── Qualify & Bulk Archive E2E ───────────────────────────────────────────────

describe("Qualify & Bulk Archive E2E", () => {
  afterEach(async () => {
    await prisma.lead.deleteMany({ where: { ownerId } });
  });

  it("PATCH /leads/:id/qualify — qualifica lead", async () => {
    const created = await request(app.getHttpServer())
      .post("/leads")
      .set("Authorization", `Bearer ${token}`)
      .send({ businessName: "Lead para Qualificar" })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/leads/${created.body.id}/qualify`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const found = await prisma.lead.findUnique({ where: { id: created.body.id } });
    expect(found?.status).toBe("qualified");
  });

  it("PATCH /leads/bulk-archive — arquiva múltiplos leads", async () => {
    const l1 = await request(app.getHttpServer())
      .post("/leads").set("Authorization", `Bearer ${token}`)
      .send({ businessName: "Bulk Lead 1" }).expect(201);
    const l2 = await request(app.getHttpServer())
      .post("/leads").set("Authorization", `Bearer ${token}`)
      .send({ businessName: "Bulk Lead 2" }).expect(201);

    const res = await request(app.getHttpServer())
      .patch("/leads/bulk-archive")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: [l1.body.id, l2.body.id], reason: "Sem interesse" })
      .expect(200);

    expect(res.body.archived).toBe(2);
    expect(res.body.skipped).toBe(0);

    const db1 = await prisma.lead.findUnique({ where: { id: l1.body.id } });
    expect(db1?.isArchived).toBe(true);
    expect(db1?.archivedReason).toBe("Sem interesse");
  });

  it("PATCH /leads/bulk-archive — pula ids não encontrados", async () => {
    const res = await request(app.getHttpServer())
      .patch("/leads/bulk-archive")
      .set("Authorization", `Bearer ${token}`)
      .send({ ids: ["id-que-nao-existe"] })
      .expect(200);

    expect(res.body.archived).toBe(0);
    expect(res.body.skipped).toBe(1);
  });
});
