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
});

afterEach(async () => {
  await prisma.leadContact.deleteMany({ where: { lead: { ownerId } } });
  await prisma.lead.deleteMany({ where: { ownerId } });
  await prisma.contact.deleteMany({ where: { ownerId } });
  await prisma.organization.deleteMany({ where: { ownerId } });
});

afterAll(async () => {
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
});
