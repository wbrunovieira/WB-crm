import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";

const fakeGmailPort = {
  send: async () => ({ messageId: "msg-1", threadId: "thread-1" }),
  pollHistory: async () => [],
  getProfile: async () => ({ emailAddress: "user@test.com", historyId: "1" }),
  getMessage: async () => null,
};
const fakeGoogleOAuthPort = {
  getValidToken: async () => "fake-token",
  storeTokens: async () => {},
};

let app: INestApplication;
let prisma: PrismaService;
let token: string;
let userId: string;

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GmailPort).useValue(fakeGmailPort)
    .overrideProvider(GoogleOAuthPort).useValue(fakeGoogleOAuthPort)
    .compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "bulk-enroll-e2e@test.com" },
    update: {},
    create: { email: "bulk-enroll-e2e@test.com", name: "Bulk Enroll E2E", password: "hashed", role: "sdr" },
  });
  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  // Clean up any previous test data
  await prisma.lead.deleteMany({ where: { ownerId: userId } });
  await prisma.leadContact.deleteMany({ where: { lead: { ownerId: userId } } });
  await prisma.contact.deleteMany({ where: { ownerId: userId } });
  await prisma.organization.deleteMany({ where: { ownerId: userId } });
  await prisma.partner.deleteMany({ where: { ownerId: userId } });
});

afterAll(async () => {
  await prisma.lead.deleteMany({ where: { ownerId: userId } });
  await prisma.contact.deleteMany({ where: { ownerId: userId } });
  await prisma.organization.deleteMany({ where: { ownerId: userId } });
  await prisma.partner.deleteMany({ where: { ownerId: userId } });
  await app.close();
});

async function createCampaign() {
  const res = await request(app.getHttpServer())
    .post("/email-campaigns")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Bulk Enroll Test", fromEmail: "bulk-enroll-e2e@test.com" });
  expect(res.status).toBe(201);
  return res.body.id as string;
}

describe("BulkEnroll — all sources", () => {
  it("enrolls leads with direct email", async () => {
    const campaignId = await createCampaign();

    await prisma.lead.create({
      data: { businessName: "Lead Direto", email: "direto@lead.com", ownerId: userId },
    });

    const res = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    expect(res.status).toBe(200);
    expect(res.body.enrolled).toBeGreaterThanOrEqual(1);

    const recipients = await prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    const emails = recipients.map((r) => r.email);
    expect(emails).toContain("direto@lead.com");
  });

  it("enrolls LeadContacts", async () => {
    const campaignId = await createCampaign();

    const lead = await prisma.lead.create({
      data: { businessName: "Lead Com Contato", ownerId: userId },
    });
    await prisma.leadContact.create({
      data: { leadId: lead.id, name: "João", email: "joao@leadcontact.com" },
    });

    const res = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    expect(res.status).toBe(200);
    const recipients = await prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    expect(recipients.map((r) => r.email)).toContain("joao@leadcontact.com");
  });

  it("deduplicates when Lead.email == LeadContact.email", async () => {
    const campaignId = await createCampaign();

    const lead = await prisma.lead.create({
      data: { businessName: "Lead Duplicado", email: "dup@empresa.com", ownerId: userId },
    });
    await prisma.leadContact.create({
      data: { leadId: lead.id, name: "Dup Contact", email: "dup@empresa.com" },
    });

    const res = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    expect(res.status).toBe(200);
    const recipients = await prisma.emailCampaignRecipient.findMany({
      where: { campaignId, email: "dup@empresa.com" },
    });
    // Same email must appear only once
    expect(recipients).toHaveLength(1);
  });

  it("enrolls contacts linked to partners", async () => {
    const campaignId = await createCampaign();

    const partner = await prisma.partner.create({
      data: { name: "Parceiro E2E", partnerType: "parceiro_tecnologico", ownerId: userId },
    });
    await prisma.contact.create({
      data: { name: "Parceiro Contact", email: "contato@parceiro.com", ownerId: userId, partnerId: partner.id },
    });

    const res = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    expect(res.status).toBe(200);
    const recipients = await prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    expect(recipients.map((r) => r.email)).toContain("contato@parceiro.com");
  });

  it("enrolls organization company email", async () => {
    const campaignId = await createCampaign();

    await prisma.organization.create({
      data: { name: "Org Com Email", email: "contato@org.com", ownerId: userId },
    });

    const res = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    expect(res.status).toBe(200);
    const recipients = await prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    expect(recipients.map((r) => r.email)).toContain("contato@org.com");
  });

  it("enrolls contacts linked to organizations", async () => {
    const campaignId = await createCampaign();

    const org = await prisma.organization.create({
      data: { name: "Org Com Contato", ownerId: userId },
    });
    await prisma.contact.create({
      data: {
        name: "Contato da Org",
        email: "pessoa@org.com",
        ownerId: userId,
        organizationId: org.id,
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    expect(res.status).toBe(200);
    const recipients = await prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    expect(recipients.map((r) => r.email)).toContain("pessoa@org.com");
  });

  it("does not re-enroll on second call (idempotent)", async () => {
    const campaignId = await createCampaign();

    await prisma.lead.create({
      data: { businessName: "Idempotent Lead", email: "idem@lead.com", ownerId: userId },
    });

    const first = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    const second = await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.enrolled).toBe(0);
    expect(second.body.skipped).toBeGreaterThanOrEqual(1);
  });

  it("DELETE /:id/recipients clears all recipients", async () => {
    const campaignId = await createCampaign();

    await prisma.lead.create({
      data: { businessName: "Clear Lead", email: "clear@lead.com", ownerId: userId },
    });

    await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/enroll`)
      .set("Authorization", `Bearer ${token}`)
      .send({ mode: "all" });

    const beforeDelete = await prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    expect(beforeDelete.length).toBeGreaterThan(0);

    const del = await request(app.getHttpServer())
      .delete(`/email-campaigns/${campaignId}/recipients`)
      .set("Authorization", `Bearer ${token}`);

    expect(del.status).toBe(200);
    expect(del.body.deleted).toBe(beforeDelete.length);

    const afterDelete = await prisma.emailCampaignRecipient.findMany({ where: { campaignId } });
    expect(afterDelete).toHaveLength(0);
  });
});
