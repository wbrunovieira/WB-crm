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
  name: "Consultoria XYZ",
  partnerType: "consultoria",
  legalName: "Consultoria XYZ Ltda",
  foundationDate: "2012-06-01",
  website: "https://xyz.com.br",
  email: "contato@xyz.com.br",
  phone: "+5511999999999",
  whatsapp: "+5511988888888",
  country: "Brasil",
  state: "SP",
  city: "São Paulo",
  zipCode: "01310-100",
  streetAddress: "Av. Paulista, 1000",
  linkedin: "https://linkedin.com/company/xyz",
  instagram: "@xyz",
  facebook: "https://facebook.com/xyz",
  twitter: "@xyz",
  industry: "Consultoria de TI",
  employeeCount: 25,
  companySize: "pequena",
  description: "Especializada em transformação digital",
  expertise: "ERP, CRM, Automação",
  notes: "Parceiro estratégico desde 2020",
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
    where: { email: "e2e-partners@test.com" },
    update: {},
    create: {
      email: "e2e-partners@test.com",
      name: "E2E Partners User",
      password: "hashed",
      role: "sdr",
    },
  });
  ownerId = user.id;

  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.partner.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-partners@test.com" } });
  await app.close();
});

describe("Partners API (e2e)", () => {

  // ─── GET /partners ─────────────────────────────────────────────────────────

  describe("GET /partners", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/partners").expect(401);
    });

    it("retorna lista vazia quando não há parceiros", async () => {
      const res = await request(app.getHttpServer())
        .get("/partners")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });

    it("retorna parceiros com relações presentes", async () => {
      await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Relações", partnerType: "consultoria" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/partners")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      const item = res.body[0];
      expect(item).toHaveProperty("owner");
      expect(item).toHaveProperty("_count");
      expect(item._count).toHaveProperty("contacts");
      expect(item._count).toHaveProperty("activities");
      expect(item._count).toHaveProperty("referredLeads");
    });

    it("filtra por search no nome", async () => {
      await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "BuscaUnicaXYZ", partnerType: "agencia_digital" })
        .expect(201);

      await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Outro Parceiro", partnerType: "fornecedor" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/partners?search=BuscaUnicaXYZ")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("BuscaUnicaXYZ");
    });
  });

  // ─── POST /partners ────────────────────────────────────────────────────────

  describe("POST /partners", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer())
        .post("/partners")
        .send({ name: "X", partnerType: "consultoria" })
        .expect(401);
    });

    it("cria parceiro com dados mínimos", async () => {
      const res = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Mínimo", partnerType: "indicador" })
        .expect(201);

      expect(res.body).toHaveProperty("id");
      expect(res.body.name).toBe("Parceiro Mínimo");
      expect(res.body.partnerType).toBe("indicador");
      expect(res.body.ownerId).toBe(ownerId);
      expect(res.body.lastContactDate).toBeTruthy();
    });

    it("cria parceiro com todos os campos", async () => {
      const res = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send(ALL_FIELDS_PAYLOAD)
        .expect(201);

      expect(res.body.name).toBe("Consultoria XYZ");
      expect(res.body.legalName).toBe("Consultoria XYZ Ltda");
      expect(res.body.partnerType).toBe("consultoria");
      expect(res.body.expertise).toBe("ERP, CRM, Automação");
      expect(res.body.companySize).toBe("pequena");
      expect(res.body.employeeCount).toBe(25);
      expect(res.body.city).toBe("São Paulo");
      expect(res.body.state).toBe("SP");
      expect(res.body.instagram).toBe("@xyz");
      expect(res.body.notes).toBe("Parceiro estratégico desde 2020");
      expect(res.body.foundationDate).toBeTruthy();
    });
  });

  // ─── GET /partners/:id ─────────────────────────────────────────────────────

  describe("GET /partners/:id", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/partners/qualquer-id").expect(401);
    });

    it("retorna parceiro com relações completas", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Detalhe", partnerType: "mentor", city: "Fortaleza" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/partners/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(created.body.id);
      expect(res.body.name).toBe("Parceiro Detalhe");
      expect(res.body.city).toBe("Fortaleza");
      expect(res.body).toHaveProperty("contacts");
      expect(res.body).toHaveProperty("activities");
      expect(res.body).toHaveProperty("referredLeads");
      expect(res.body.contacts).toBeInstanceOf(Array);
      expect(res.body.activities).toBeInstanceOf(Array);
    });

    it("retorna 404 quando parceiro não existe", async () => {
      await request(app.getHttpServer())
        .get("/partners/id-inexistente-123")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── PATCH /partners/:id ───────────────────────────────────────────────────

  describe("PATCH /partners/:id", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).patch("/partners/qualquer-id").send({ name: "X" }).expect(401);
    });

    it("atualiza parceiro existente", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Original", partnerType: "fornecedor" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Atualizado", city: "Manaus", expertise: "Logística" })
        .expect(200);

      expect(res.body.name).toBe("Atualizado");
      expect(res.body.city).toBe("Manaus");
      expect(res.body.expertise).toBe("Logística");
    });

    it("retorna 404 quando parceiro não existe", async () => {
      await request(app.getHttpServer())
        .patch("/partners/id-inexistente-999")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Novo" })
        .expect(404);
    });

    it("atualiza foundationDate (DateTime)", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Data", partnerType: "universidade" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ foundationDate: "2000-01-15" })
        .expect(200);

      expect(res.body.foundationDate).toBeTruthy();
    });
  });

  // ─── DELETE /partners/:id ──────────────────────────────────────────────────

  describe("DELETE /partners/:id", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).delete("/partners/qualquer-id").expect(401);
    });

    it("deleta parceiro e retorna 204", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Para Deletar", partnerType: "outros" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/partners/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/partners/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna 404 quando parceiro não existe", async () => {
      await request(app.getHttpServer())
        .delete("/partners/id-inexistente-del")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── PATCH /partners/:id/last-contact ──────────────────────────────────────

  describe("PATCH /partners/:id/last-contact", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).patch("/partners/qualquer-id/last-contact").expect(401);
    });

    it("atualiza lastContactDate e retorna parceiro", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Contato", partnerType: "associacao" })
        .expect(201);

      const originalDate = created.body.lastContactDate;

      await new Promise((r) => setTimeout(r, 10));

      const res = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}/last-contact`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.lastContactDate).toBeTruthy();
      expect(new Date(res.body.lastContactDate).getTime()).toBeGreaterThanOrEqual(
        new Date(originalDate).getTime(),
      );
    });

    it("retorna 404 quando parceiro não existe", async () => {
      await request(app.getHttpServer())
        .patch("/partners/id-inexistente/last-contact")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });
});
