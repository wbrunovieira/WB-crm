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
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.contact.deleteMany({ where: { ownerId } });
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

    it("filtra por partnerStatus", async () => {
      await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Prospect Parceiro", partnerType: "agencia_digital" })
        .expect(201);
      await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Ativo Parceiro", partnerType: "consultoria", partnerStatus: "active" })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get("/partners?status=active")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe("Ativo Parceiro");
      expect(res.body[0].partnerStatus).toBe("active");
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
      // Default lifecycle stage is "prospect" (partner lead)
      expect(res.body.partnerStatus).toBe("prospect");
      expect(res.body.partnershipStartedAt).toBeNull();
    });

    it("cria já como 'active' e carimba partnershipStartedAt", async () => {
      const res = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Ativo", partnerType: "consultoria", partnerStatus: "active" })
        .expect(201);

      expect(res.body.partnerStatus).toBe("active");
      expect(res.body.partnershipStartedAt).toBeTruthy();
    });

    it("rejeita partnerStatus inválido", async () => {
      const res = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Ruim", partnerType: "consultoria", partnerStatus: "banana" });

      expect(res.status).toBeGreaterThanOrEqual(400);
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

    it("faz roll-up: inclui atividades dos contatos mesmo sem partnerId na atividade", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Rollup", partnerType: "consultoria" })
        .expect(201);
      const partnerId = created.body.id;

      const contact = await prisma.contact.create({
        data: { name: "Contato Rollup", ownerId, partnerId },
      });
      // Activity saved with contactId only (like inbound sync does) — no partnerId.
      const act = await prisma.activity.create({
        data: { type: "email", subject: "Email via contato (roll-up)", ownerId, contactId: contact.id },
      });

      const res = await request(app.getHttpServer())
        .get(`/partners/${partnerId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const ids = res.body.activities.map((a: { id: string }) => a.id);
      expect(ids).toContain(act.id);
      // "Último contato" derives from the most recent contact activity (email is one).
      expect(res.body.lastContactAt).toBeTruthy();
    });

    it("devolve os campos ricos de atividade (GoTo + rastreio de e-mail) para a timeline", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Rico", partnerType: "consultoria" })
        .expect(201);
      const partnerId = created.body.id;

      const call = await prisma.activity.create({
        data: {
          type: "call",
          subject: "Ligação GoTo",
          ownerId,
          partnerId,
          gotoCallId: "goto-123",
          gotoCallOutcome: "answered",
          gotoDuration: 42,
          gotoRecordingUrl: "s3://bucket/agent.mp3",
          gotoTranscriptText: "olá, tudo bem?",
        },
      });
      const email = await prisma.activity.create({
        data: {
          type: "email",
          subject: "E-mail rastreado",
          ownerId,
          partnerId,
          emailThreadId: "thread-1",
          emailSubject: "Proposta",
          emailFromAddress: "cliente@empresa.com",
          emailOpenCount: 3,
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/partners/${partnerId}`)
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const byId = (id: string) =>
        res.body.activities.find((a: { id: string }) => a.id === id);

      const callActivity = byId(call.id);
      expect(callActivity).toBeDefined();
      expect(callActivity.gotoCallId).toBe("goto-123");
      expect(callActivity.gotoCallOutcome).toBe("answered");
      expect(callActivity.gotoDuration).toBe(42);
      expect(callActivity.gotoRecordingUrl).toBe("s3://bucket/agent.mp3");
      expect(callActivity.gotoTranscriptText).toBe("olá, tudo bem?");
      // clickUrls is always present (empty when there is no campaign send)
      expect(callActivity.clickUrls).toEqual([]);

      const emailActivity = byId(email.id);
      expect(emailActivity).toBeDefined();
      expect(emailActivity.emailThreadId).toBe("thread-1");
      expect(emailActivity.emailFromAddress).toBe("cliente@empresa.com");
      expect(emailActivity.emailOpenCount).toBe(3);
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

    it("define e limpa starRating (classificação por estrelas)", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners").set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Estrela", partnerType: "consultoria" }).expect(201);
      expect(created.body.starRating ?? null).toBeNull();

      const rated = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ starRating: 5 }).expect(200);
      expect(rated.body.starRating).toBe(5);

      const detail = await request(app.getHttpServer())
        .get(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(detail.body.starRating).toBe(5);

      const cleared = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ starRating: null }).expect(200);
      expect(cleared.body.starRating).toBeNull();

      const bad = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ starRating: 9 });
      expect(bad.status).toBeGreaterThanOrEqual(400);
    });

    it("persiste languages (idiomas) no create e no update", async () => {
      const langs = JSON.stringify([{ code: "pt-BR", isPrimary: true }, { code: "en", isPrimary: false }]);
      const created = await request(app.getHttpServer())
        .post("/partners").set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Poliglota", partnerType: "consultoria", languages: langs }).expect(201);
      expect(created.body.languages).toBe(langs);

      const newLangs = JSON.stringify([{ code: "es", isPrimary: true }]);
      const updated = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ languages: newLangs }).expect(200);
      expect(updated.body.languages).toBe(newLangs);

      const detail = await request(app.getHttpServer())
        .get(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(detail.body.languages).toBe(newLangs);

      // Sending null clears; omitting preserves
      const preserved = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ city: "Curitiba" }).expect(200);
      expect(preserved.body.languages).toBe(newLangs);

      const cleared = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`)
        .send({ languages: null }).expect(200);
      expect(cleared.body.languages).toBeNull();
    });

    it("verifica telefones do parceiro e persiste no detalhe", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners").set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Fone", partnerType: "consultoria", phone: "+5511988887777" }).expect(201);

      const res = await request(app.getHttpServer())
        .post(`/phone/verify/partner/${created.body.id}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.phone).toBeDefined();

      const detail = await request(app.getHttpServer())
        .get(`/partners/${created.body.id}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(detail.body.phoneValid).toBe(res.body.phone.valid);
    });

    it("retorna 404 ao verificar email de parceiro sem email", async () => {
      // Partner without email → the email verify route returns 404 ("não possui email")
      const created = await request(app.getHttpServer())
        .post("/partners").set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Sem Email", partnerType: "consultoria" }).expect(201);

      const noEmail = await request(app.getHttpServer())
        .post(`/phone/verify/partner/${created.body.id}/email`).set("Authorization", `Bearer ${token}`);
      expect(noEmail.status).toBe(404);
    });

    it("rejeita verificar parceiro de outro dono (403)", async () => {
      const otherUser = await prisma.user.create({
        data: { email: "e2e-partner-verify-other@test.com", name: "Outro", password: "x", role: "sdr" },
      });
      const foreign = await prisma.partner.create({
        data: { name: "Alheio", partnerType: "consultoria", ownerId: otherUser.id, phone: "+5511900000000" },
      });

      await request(app.getHttpServer())
        .post(`/phone/verify/partner/${foreign.id}`).set("Authorization", `Bearer ${token}`).expect(403);

      await prisma.partner.delete({ where: { id: foreign.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it("CNAE primário/secundário e setor do parceiro (fluxo completo)", async () => {
      const cnaeA = await prisma.cNAE.create({ data: { code: "9999-9/01", description: "Atividade E2E A" } });
      const cnaeB = await prisma.cNAE.create({ data: { code: "9999-9/02", description: "Atividade E2E B" } });
      const sector = await prisma.sector.create({
        data: { name: "Setor E2E", slug: `setor-e2e-${ownerId}`, ownerId, isActive: true },
      });

      const created = await request(app.getHttpServer())
        .post("/partners").set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro CNAE", partnerType: "consultoria", primaryCNAEId: cnaeA.id, internationalActivity: "Dev" }).expect(201);
      const pid = created.body.id;
      expect(created.body.primaryCNAEId).toBe(cnaeA.id);

      // Detail returns the hydrated primary CNAE object
      const detail = await request(app.getHttpServer())
        .get(`/partners/${pid}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(detail.body.primaryCNAE).toMatchObject({ id: cnaeA.id, code: "9999-9/01" });
      expect(detail.body.internationalActivity).toBe("Dev");

      // Secondary CNAE: add → list → remove
      await request(app.getHttpServer())
        .post(`/cnaes/partners/${pid}/${cnaeB.id}`).set("Authorization", `Bearer ${token}`).expect(204);
      const cnaesList = await request(app.getHttpServer())
        .get(`/cnaes/partners/${pid}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(cnaesList.body.map((c: { id: string }) => c.id)).toContain(cnaeB.id);
      await request(app.getHttpServer())
        .delete(`/cnaes/partners/${pid}/${cnaeB.id}`).set("Authorization", `Bearer ${token}`).expect(204);

      // Sector: link → list → unlink
      await request(app.getHttpServer())
        .post(`/sectors/partners/${pid}/${sector.id}`).set("Authorization", `Bearer ${token}`).expect(204);
      const sectorsList = await request(app.getHttpServer())
        .get(`/sectors/partners/${pid}`).set("Authorization", `Bearer ${token}`).expect(200);
      expect(sectorsList.body.map((s: { sector: { id: string } }) => s.sector.id)).toContain(sector.id);
      await request(app.getHttpServer())
        .delete(`/sectors/partners/${pid}/${sector.id}`).set("Authorization", `Bearer ${token}`).expect(204);

      // Cleanup (partner is removed by afterEach; junctions cascade)
      await prisma.sector.delete({ where: { id: sector.id } });
      await prisma.cNAE.deleteMany({ where: { id: { in: [cnaeA.id, cnaeB.id] } } });
    });

    it("tech profile do parceiro: add → get → remove nos 7 tipos", async () => {
      // Exercise ALL 7 tech types end-to-end (each hits a distinct junction map
      // entry in the repo — guards against a wrong Prisma model name/casing).
      const specs = [
        { type: "language",  catModel: "techProfileLanguage",  resultKey: "languages",  extra: {} },
        { type: "framework", catModel: "techProfileFramework", resultKey: "frameworks", extra: {} },
        { type: "hosting",   catModel: "techProfileHosting",   resultKey: "hosting",    extra: { type: "cloud" } },
        { type: "database",  catModel: "techProfileDatabase",  resultKey: "databases",  extra: { type: "sql" } },
        { type: "erp",       catModel: "techProfileERP",       resultKey: "erps",       extra: {} },
        { type: "crm",       catModel: "techProfileCRM",       resultKey: "crms",       extra: {} },
        { type: "ecommerce", catModel: "techProfileEcommerce", resultKey: "ecommerce",  extra: {} },
      ] as const;

      const created = await request(app.getHttpServer())
        .post("/partners").set("Authorization", `Bearer ${token}`)
        .send({ name: "Parceiro Tech", partnerType: "consultoria" }).expect(201);
      const pid = created.body.id;

      const createdItems: { catModel: string; id: string }[] = [];
      for (const s of specs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const item = await (prisma as any)[s.catModel].create({
          data: { name: `e2e-${s.type}`, slug: `e2e-${s.type}-${ownerId}`, isActive: true, ...s.extra },
        });
        createdItems.push({ catModel: s.catModel, id: item.id });

        await request(app.getHttpServer())
          .post(`/partners/${pid}/tech-profile/${s.type}/${item.id}`).set("Authorization", `Bearer ${token}`).expect(204);
        // idempotent: second add must not error (unique key correct)
        await request(app.getHttpServer())
          .post(`/partners/${pid}/tech-profile/${s.type}/${item.id}`).set("Authorization", `Bearer ${token}`).expect(204);

        const profile = await request(app.getHttpServer())
          .get(`/partners/${pid}/tech-profile`).set("Authorization", `Bearer ${token}`).expect(200);
        expect(profile.body[s.resultKey].map((i: { id: string }) => i.id)).toContain(item.id);

        await request(app.getHttpServer())
          .delete(`/partners/${pid}/tech-profile/${s.type}/${item.id}`).set("Authorization", `Bearer ${token}`).expect(204);
        const after = await request(app.getHttpServer())
          .get(`/partners/${pid}/tech-profile`).set("Authorization", `Bearer ${token}`).expect(200);
        expect(after.body[s.resultKey].map((i: { id: string }) => i.id)).not.toContain(item.id);
      }

      // invalid type → 422
      await request(app.getHttpServer())
        .post(`/partners/${pid}/tech-profile/bad-type/x`).set("Authorization", `Bearer ${token}`).expect(422);

      for (const it of createdItems) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any)[it.catModel].delete({ where: { id: it.id } });
      }
    });

    it("oficializar (prospect → active) carimba partnershipStartedAt e o preserva depois", async () => {
      const created = await request(app.getHttpServer())
        .post("/partners")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "A Oficializar", partnerType: "consultoria" })
        .expect(201);
      expect(created.body.partnerStatus).toBe("prospect");

      const officialized = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ partnerStatus: "active" })
        .expect(200);
      expect(officialized.body.partnerStatus).toBe("active");
      expect(officialized.body.partnershipStartedAt).toBeTruthy();
      const started = officialized.body.partnershipStartedAt;

      // A later edit that omits partnershipStartedAt must not wipe it (PATCH semantics).
      const edited = await request(app.getHttpServer())
        .patch(`/partners/${created.body.id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ city: "Curitiba" })
        .expect(200);
      expect(edited.body.city).toBe("Curitiba");
      expect(edited.body.partnershipStartedAt).toBe(started);
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
