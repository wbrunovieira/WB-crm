import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";
import { SendCampaignStepUseCase } from "@/domain/email-campaigns/application/use-cases/send-campaign-step.use-case";

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
let sendStep: SendCampaignStepUseCase;

const FROM = "suppression-e2e@test.com";
const SUPP_EMAIL = "prior-bounce@e2e.test";
const FRESH_EMAIL = "fresh@e2e.test";

async function cleanup() {
  await prisma.emailCampaignRecipient.deleteMany({ where: { campaign: { ownerId: userId } } });
  await prisma.emailCampaign.deleteMany({ where: { ownerId: userId } });
  await prisma.emailSuppression.deleteMany({ where: { ownerId: userId } });
}

beforeAll(async () => {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(GmailPort).useValue(fakeGmailPort)
    .overrideProvider(GoogleOAuthPort).useValue(fakeGoogleOAuthPort)
    .compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  sendStep = module.get(SendCampaignStepUseCase);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: FROM },
    update: {},
    create: { email: FROM, name: "Suppression E2E", password: "hashed", role: "sdr" },
  });
  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });

  await cleanup(); // self-clean at START (shared dev DB)
});

afterAll(async () => {
  await cleanup();
  await app.close();
});

describe("Email campaign suppression — SUPPRESSED is not a BOUNCE", () => {
  it("a recipient on the suppression list (prior bounce) is marked SUPPRESSED, never sent, and kept OUT of the bounce rate", async () => {
    // 1. create campaign
    const c = await request(app.getHttpServer())
      .post("/email-campaigns")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Suppression E2E", fromEmail: FROM });
    expect(c.status).toBe(201);
    const campaignId = c.body.id as string;

    // 2. add step 0
    await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/steps`)
      .set("Authorization", `Bearer ${token}`)
      .send({ order: 0, subject: "S", bodyHtml: "B", delayDays: 0 })
      .expect(201);

    // 3. a prior bounce already put this email on the suppression list
    await prisma.emailSuppression.create({ data: { email: SUPP_EMAIL, ownerId: userId, reason: "bounced" } });

    // 4. enroll the suppressed email + a fresh one
    await request(app.getHttpServer())
      .post(`/email-campaigns/${campaignId}/recipients`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        recipients: [
          { recipientType: "LEAD", recipientId: "lead-supp", email: SUPP_EMAIL },
          { recipientType: "LEAD", recipientId: "lead-fresh", email: FRESH_EMAIL },
        ],
      })
      .expect(201);

    // 5. activate (without the /start auto-send, so the send below is deterministic)
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: "ACTIVE" } });

    // 6. send step 0 deterministically
    const sent = await sendStep.execute({ campaignId, stepOrder: 0, delayRange: { min: 0, max: 0 } });
    expect(sent.isRight()).toBe(true);

    // 7. the suppressed recipient must be SUPPRESSED (not BOUNCED) and never sent
    const supp = await prisma.emailCampaignRecipient.findFirst({ where: { campaignId, email: SUPP_EMAIL } });
    expect(supp?.status).toBe("SUPPRESSED");
    const suppSends = await prisma.emailCampaignSend.count({ where: { recipient: { campaignId, email: SUPP_EMAIL } } });
    expect(suppSends).toBe(0);

    // the fresh one was actually sent
    const fresh = await prisma.emailCampaignRecipient.findFirst({ where: { campaignId, email: FRESH_EMAIL } });
    expect(fresh?.status).toBe("COMPLETED");

    // 8. stats: suppressed counted apart; bounce rate is 0 (no REAL bounce happened)
    const stats = await request(app.getHttpServer())
      .get(`/email-campaigns/${campaignId}/stats`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(stats.body.recipients.suppressed).toBe(1);
    expect(stats.body.recipients.bounced).toBe(0);
    expect(stats.body.totals.bounceRate).toBe(0);
  });
});
