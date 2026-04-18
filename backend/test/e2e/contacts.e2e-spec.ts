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
  name: "Maria Completa",
  email: "maria@completa.com",
  phone: "+55 11 91234-5678",
  whatsapp: "+5511912345678",
  role: "Gerente de Vendas",
  department: "Vendas",
  linkedin: "linkedin.com/in/mariacompleta",
  instagram: "@mariacompleta",
  status: "active",
  isPrimary: true,
  birthDate: "1990-06-15",          // formato date-only do frontend (YYYY-MM-DD)
  notes: "Contato VIP para testes",
  preferredLanguage: "pt-BR",
  languages: [{ code: "pt-BR", isPrimary: true }, { code: "en", isPrimary: false }],
  source: "Website",
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
    where: { email: "e2e-contacts@test.com" },
    update: {},
    create: {
      email: "e2e-contacts@test.com",
      name: "E2E Contacts User",
      password: "hashed",
      role: "sdr",
    },
  });
  ownerId = user.id;

  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterEach(async () => {
  await prisma.contact.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: "e2e-contacts@test.com" } });
  await app.close();
});

describe("Contacts API (e2e)", () => {

  // ─── GET /contacts ────────────────────────────────────────────────────────

  describe("GET /contacts", () => {
    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer()).get("/contacts").expect(401);
    });

    it("retorna lista vazia quando não há contatos", async () => {
      const res = await request(app.getHttpServer())
        .get("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body).toHaveLength(0);
    });

    it("retorna contatos com campos de relação presentes", async () => {
      await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Relações E2E" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      const item = res.body[0];
      expect(item).toHaveProperty("organization");
      expect(item).toHaveProperty("lead");
      expect(item).toHaveProperty("partner");
      expect(item).toHaveProperty("owner");
      expect(item.organization).toBeNull();
      expect(item.lead).toBeNull();
      expect(item.partner).toBeNull();
    });

    it("filtra por search", async () => {
      await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Filtro Busca", email: "filtro@busca.com" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/contacts?search=filtro")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].name).toBe("Filtro Busca");
    });

    it("filtra por status", async () => {
      await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Ativo Status", status: "active" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/contacts?status=active")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.every((c: { status: string }) => c.status === "active")).toBe(true);
    });
  });

  // ─── POST /contacts ───────────────────────────────────────────────────────

  describe("POST /contacts", () => {
    it("cria contato com apenas o nome obrigatório", async () => {
      const res = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Mínimo E2E" })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("Mínimo E2E");
      expect(res.body.ownerId).toBe(ownerId);
    });

    it("cria contato com TODOS os campos incluindo birthDate no formato YYYY-MM-DD", async () => {
      const res = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send(ALL_FIELDS_PAYLOAD)
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe(ALL_FIELDS_PAYLOAD.name);
      expect(res.body.email).toBe(ALL_FIELDS_PAYLOAD.email);
      expect(res.body.phone).toBe(ALL_FIELDS_PAYLOAD.phone);
      expect(res.body.whatsapp).toBe(ALL_FIELDS_PAYLOAD.whatsapp);
      expect(res.body.role).toBe(ALL_FIELDS_PAYLOAD.role);
      expect(res.body.department).toBe(ALL_FIELDS_PAYLOAD.department);
      expect(res.body.linkedin).toBe(ALL_FIELDS_PAYLOAD.linkedin);
      expect(res.body.instagram).toBe(ALL_FIELDS_PAYLOAD.instagram);
      expect(res.body.status).toBe("active");
      expect(res.body.isPrimary).toBe(true);
      expect(res.body.notes).toBe(ALL_FIELDS_PAYLOAD.notes);
      expect(res.body.preferredLanguage).toBe("pt-BR");
      expect(res.body.source).toBe(ALL_FIELDS_PAYLOAD.source);
      expect(res.body.ownerId).toBe(ownerId);

      // birthDate: enviado como "1990-06-15", deve ser persistido como DateTime válido
      expect(res.body.birthDate).toBeDefined();
      expect(new Date(res.body.birthDate).getFullYear()).toBe(1990);
      expect(new Date(res.body.birthDate).getMonth()).toBe(5); // 0-based → junho

      // languages: deve ser persistido como array JSON
      const langs = typeof res.body.languages === "string"
        ? JSON.parse(res.body.languages)
        : res.body.languages;
      expect(langs).toBeInstanceOf(Array);
      expect(langs.some((l: { code: string }) => l.code === "pt-BR")).toBe(true);
      expect(langs.some((l: { code: string }) => l.code === "en")).toBe(true);
    });

    it("birthDate em formato ISO completo também funciona", async () => {
      const res = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "ISO Date", birthDate: "1985-12-25T00:00:00.000Z" })
        .expect(201);

      expect(res.body.birthDate).toBeDefined();
      expect(new Date(res.body.birthDate).getFullYear()).toBe(1985);
    });

    it("retorna 401 sem token", async () => {
      await request(app.getHttpServer())
        .post("/contacts")
        .send({ name: "Sem Token" })
        .expect(401);
    });
  });

  // ─── GET /contacts/:id ────────────────────────────────────────────────────

  describe("GET /contacts/:id", () => {
    it("retorna contato por id com todas as relações", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send(ALL_FIELDS_PAYLOAD)
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.name).toBe(ALL_FIELDS_PAYLOAD.name);
      expect(res.body.email).toBe(ALL_FIELDS_PAYLOAD.email);
      expect(res.body).toHaveProperty("organization");
      expect(res.body).toHaveProperty("lead");
      expect(res.body).toHaveProperty("partner");
      expect(res.body).toHaveProperty("owner");
      expect(res.body).toHaveProperty("deals");
      expect(res.body).toHaveProperty("activities");
      expect(res.body.deals).toBeInstanceOf(Array);
      expect(res.body.activities).toBeInstanceOf(Array);
      expect(res.body.birthDate).toBeDefined();
    });

    it("retorna 404 para id inexistente", async () => {
      await request(app.getHttpServer())
        .get("/contacts/id-que-nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });
  });

  // ─── PATCH /contacts/:id ──────────────────────────────────────────────────

  describe("PATCH /contacts/:id", () => {
    it("atualiza nome do contato", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Original" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Atualizado" })
        .expect(200);

      expect(res.body.name).toBe("Atualizado");
    });

    it("atualiza todos os campos incluindo birthDate no formato YYYY-MM-DD", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Antes da atualização" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Depois da atualização",
          email: "novo@email.com",
          phone: "+55 21 98765-4321",
          whatsapp: "+5521987654321",
          role: "Diretor",
          department: "Diretoria",
          linkedin: "linkedin.com/in/diretor",
          instagram: "@diretor",
          status: "active",
          isPrimary: false,
          birthDate: "2000-01-20",
          notes: "Nota atualizada",
          preferredLanguage: "en",
          languages: [{ code: "en", isPrimary: true }],
          source: "Indicação",
        })
        .expect(200);

      expect(res.body.name).toBe("Depois da atualização");
      expect(res.body.email).toBe("novo@email.com");
      expect(res.body.phone).toBe("+55 21 98765-4321");
      expect(res.body.role).toBe("Diretor");
      expect(res.body.department).toBe("Diretoria");
      expect(res.body.linkedin).toBe("linkedin.com/in/diretor");
      expect(res.body.source).toBe("Indicação");
      expect(res.body.birthDate).toBeDefined();
      expect(new Date(res.body.birthDate).getFullYear()).toBe(2000);
      expect(new Date(res.body.birthDate).getMonth()).toBe(0); // janeiro
    });

    it("retorna 404 ao atualizar id inexistente", async () => {
      await request(app.getHttpServer())
        .patch("/contacts/id-que-nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Fantasma" })
        .expect(404);
    });
  });

  // ─── PATCH /contacts/:id/status ───────────────────────────────────────────

  describe("PATCH /contacts/:id/status", () => {
    it("alterna status de active para inactive", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Toggle E2E", status: "active" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/contacts/${created.body.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.status).toBe("inactive");
    });

    it("alterna status de inactive de volta para active", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Toggle Volta", status: "active" })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/contacts/${created.body.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/contacts/${created.body.id}/status`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body.status).toBe("active");
    });
  });

  // ─── DELETE /contacts/:id ─────────────────────────────────────────────────

  describe("DELETE /contacts/:id", () => {
    it("deleta contato e retorna 404 na busca subsequente", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Para Deletar" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      await request(app.getHttpServer())
        .get(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("retorna 404 ao deletar id inexistente", async () => {
      await request(app.getHttpServer())
        .delete("/contacts/id-que-nao-existe")
        .set("Authorization", `Bearer ${token}`)
        .expect(404);
    });

    it("não aparece mais na listagem após deleção", async () => {
      const created = await request(app.getHttpServer())
        .post("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Sumindo da Lista" })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/contacts/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(204);

      const list = await request(app.getHttpServer())
        .get("/contacts")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const found = list.body.find((c: { id: string }) => c.id === created.body.id);
      expect(found).toBeUndefined();
    });
  });
});
