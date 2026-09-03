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
let stageId: string;
let pipelineId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
  app = module.createNestApplication();
  await app.init();
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-conversion@test.com" },
    update: {},
    create: { email: "e2e-conversion@test.com", name: "E2E Conversion User", password: "hashed", role: "sdr" },
  });
  ownerId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  const pipeline = await prisma.pipeline.create({ data: { name: `E2E Conversion Pipeline ${Date.now()}` } });
  pipelineId = pipeline.id;
  const stage = await prisma.stage.create({ data: { name: "E2E Conv Stage", pipelineId, order: 1, probability: 50 } });
  stageId = stage.id;
});

afterEach(async () => {
  // Deals and activities first: they hold FKs to lead/organization.
  await prisma.deal.deleteMany({ where: { ownerId } });
  await prisma.activity.deleteMany({ where: { ownerId } });
  await prisma.leadContact.deleteMany({ where: { lead: { ownerId } } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.contact.deleteMany({ where: { ownerId } });
  await prisma.organization.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
  await prisma.stage.deleteMany({ where: { pipelineId } });
  await prisma.pipeline.deleteMany({ where: { id: pipelineId } });
  await prisma.user.deleteMany({ where: { email: "e2e-conversion@test.com" } });
  await app.close();
});

async function createLead(extra: Record<string, unknown> = {}) {
  return prisma.lead.create({
    data: {
      ownerId,
      businessName: "Acme Tech Ltda",
      registeredName: "Acme Tecnologia LTDA",
      companyRegistrationID: `CNPJ-${Date.now()}`,
      city: "São Paulo",
      state: "SP",
      country: "Brasil",
      phone: "11999990000",
      email: "contato@acme.com",
      website: "https://acme.com",
      status: "contacted",
      ...extra,
    },
  });
}

describe("POST /leads/:id/convert (e2e)", () => {
  it("retorna 401 sem token", async () => {
    await request(app.getHttpServer()).post("/leads/nonexistent/convert").expect(401);
  });

  it("retorna 404 para lead inexistente", async () => {
    await request(app.getHttpServer())
      .post("/leads/nonexistent/convert")
      .set("Authorization", `Bearer ${token}`)
      .expect(404);
  });

  it("converte lead em organização com sucesso", async () => {
    const lead = await createLead();

    // Add two lead contacts
    await prisma.leadContact.createMany({
      data: [
        { leadId: lead.id, name: "João Silva", role: "CTO", email: "joao@acme.com", isPrimary: true },
        { leadId: lead.id, name: "Maria Lima", role: "CEO", email: "maria@acme.com", isPrimary: false },
      ],
    });

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.organizationId).toBeDefined();
    expect(res.body.contactIds).toHaveLength(2);

    // Verify organization was created in DB
    const org = await prisma.organization.findUnique({ where: { id: res.body.organizationId } });
    expect(org).not.toBeNull();
    expect(org!.name).toBe("Acme Tech Ltda");
    expect(org!.sourceLeadId).toBe(lead.id);

    // Verify lead status updated
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updatedLead!.status).toBe("qualified");
    expect(updatedLead!.convertedToOrganizationId).toBe(res.body.organizationId);

    // Verify contacts were created
    const contacts = await prisma.contact.findMany({ where: { organizationId: res.body.organizationId } });
    expect(contacts).toHaveLength(2);
    expect(contacts.map((c) => c.name).sort()).toEqual(["João Silva", "Maria Lima"].sort());

    // Verify LeadContacts linked to Contacts
    const leadContacts = await prisma.leadContact.findMany({ where: { leadId: lead.id } });
    expect(leadContacts.every((lc) => lc.convertedToContactId !== null)).toBe(true);
  });

  it("converte lead sem contatos (organização criada, zero contacts)", async () => {
    const lead = await createLead({ companyRegistrationID: `CNPJ-NC-${Date.now()}` });

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.organizationId).toBeDefined();
    expect(res.body.contactIds).toHaveLength(0);
  });

  it("retorna 422 ao converter lead já convertido", async () => {
    const lead = await createLead({ companyRegistrationID: `CNPJ-AC-${Date.now()}` });

    // First conversion
    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // Second conversion attempt
    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(422);
  });

  it("retorna 403 quando outro usuário tenta converter", async () => {
    const lead = await createLead({ companyRegistrationID: `CNPJ-OTH-${Date.now()}` });

    // Create another user
    const other = await prisma.user.upsert({
      where: { email: "e2e-conversion-other@test.com" },
      update: {},
      create: { email: "e2e-conversion-other@test.com", name: "Other User", password: "hashed", role: "sdr" },
    });
    const otherToken = jwt.sign({ sub: other.id, name: other.name, email: other.email, role: other.role });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${otherToken}`)
      .expect(403);

    await prisma.user.delete({ where: { id: other.id } });
  });

  it("copia tech profile do lead para a organização", async () => {
    const lead = await createLead({ companyRegistrationID: `CNPJ-TP-${Date.now()}` });

    // Seed a language and link to lead
    const lang = await prisma.techProfileLanguage.findFirst({ where: { isActive: true } });
    if (lang) {
      await prisma.leadLanguage.create({ data: { leadId: lead.id, languageId: lang.id } });
    }

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    if (lang) {
      const orgLang = await prisma.organizationLanguage.findFirst({
        where: { organizationId: res.body.organizationId, languageId: lang.id },
      });
      expect(orgLang).not.toBeNull();
    }
  });

  it("copia para a organização os campos fiscais/cadastrais que ela já tem coluna para guardar", async () => {
    // Nenhum destes precisa de migração: as colunas existem nos dois modelos. A conversão
    // copiava 22 campos e ignorava estes, então o dado evaporava a cada conversão — inclusive
    // o número de funcionários, que muda de nome no caminho (employeesCount → employeeCount).
    const lead = await createLead({
      companyRegistrationID: `CNPJ-FISC-${Date.now()}`,
      employeesCount: 42,
      segment: "Panificação",
      legalNature: "Sociedade Empresária Limitada",
      branchType: "matriz",
      simplesNacional: true,
      isMei: false,
      revenueRange: "1M-5M",
      phone2: "+551133334444",
      sourceGroup: "porta-a-porta",
    });

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const org = await prisma.organization.findUnique({ where: { id: res.body.organizationId } });
    expect(org!.employeeCount).toBe(42);
    expect(org!.segment).toBe("Panificação");
    expect(org!.legalNature).toBe("Sociedade Empresária Limitada");
    expect(org!.branchType).toBe("matriz");
    expect(org!.simplesNacional).toBe(true);
    expect(org!.isMei).toBe(false);
    expect(org!.revenueRange).toBe("1M-5M");
    expect(org!.phone2).toBe("+551133334444");
    expect(org!.sourceGroup).toBe("porta-a-porta");
  });

  it("preenche convertedAt no lead e na organização, e arquiva o lead", async () => {
    // convertedAt no lead era gravado pela Server Action original e caiu na migração M14
    // (commit 11c18411). O da organização é novo: "desde quando esta empresa é cliente".
    const lead = await createLead({ companyRegistrationID: `CNPJ-CA-${Date.now()}` });
    const before = Date.now();

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const updated = await prisma.lead.findUnique({ where: { id: lead.id } });
    expect(updated!.convertedAt).not.toBeNull();
    expect(updated!.convertedAt!.getTime()).toBeGreaterThanOrEqual(before);
    // Deixa de ser lead na operação: some das listas de prospecção.
    expect(updated!.isArchived).toBe(true);
    expect(updated!.archivedReason).toBeTruthy();

    const org = await prisma.organization.findUnique({ where: { id: res.body.organizationId } });
    expect(org!.convertedAt).not.toBeNull();
  });

  it("leva os negócios do lead para a organização, preservando a procedência", async () => {
    const lead = await createLead({ companyRegistrationID: `CNPJ-DEAL-${Date.now()}` });
    const deal = await prisma.deal.create({
      data: { title: "Negócio do lead", ownerId, stageId, value: 1500, status: "open", leadId: lead.id },
    });

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const moved = await prisma.deal.findUnique({ where: { id: deal.id } });
    expect(moved!.organizationId).toBe(res.body.organizationId);
    // leadId permanece: é a procedência, mesmo papel do sourceLeadId da organização.
    expect(moved!.leadId).toBe(lead.id);
  });

  it("leva as atividades do lead para a organização", async () => {
    const lead = await createLead({ companyRegistrationID: `CNPJ-ACT-${Date.now()}` });
    const activity = await prisma.activity.create({
      data: { type: "physical_visit", subject: "Visita da época de lead", ownerId, leadId: lead.id },
    });

    const res = await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const moved = await prisma.activity.findUnique({ where: { id: activity.id } });
    expect(moved!.organizationId).toBe(res.body.organizationId);
    expect(moved!.leadId).toBe(lead.id);
  });

  it("as atividades da época de lead continuam visíveis depois da conversão", async () => {
    // O filtro de arquivados existe para sumir com ruído de lead MORTO. Um lead convertido não
    // é lead morto, é cliente — esconder o histórico dele apagaria follow-ups pendentes da
    // lista de atividades e da tela de Visitas do dia do app, sem aviso nenhum.
    const lead = await createLead({ companyRegistrationID: `CNPJ-VIS-${Date.now()}` });
    const activity = await prisma.activity.create({
      data: { type: "physical_visit", subject: "Follow-up pendente da prospecção", ownerId, leadId: lead.id, completed: false },
    });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/activities?owner=mine")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.map((a: { id: string }) => a.id)).toContain(activity.id);
  });

  it("lead convertido some da listagem de leads", async () => {
    const lead = await createLead({ businessName: "Some Da Lista Ltda", companyRegistrationID: `CNPJ-LST-${Date.now()}` });

    await request(app.getHttpServer())
      .post(`/leads/${lead.id}/convert`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const res = await request(app.getHttpServer())
      .get("/leads?owner=mine")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const rows = Array.isArray(res.body) ? res.body : res.body.leads ?? res.body.data ?? [];
    expect(rows.map((l: { id: string }) => l.id)).not.toContain(lead.id);
  });
});
