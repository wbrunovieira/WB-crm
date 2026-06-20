import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "@/app.module";
import { PrismaService } from "@/infra/database/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { GmailPort } from "@/domain/integrations/email/application/ports/gmail.port";
import { GoogleOAuthPort } from "@/domain/integrations/email/application/ports/google-oauth.port";

const VALID_TRACKING_TOKEN = "abcdefghijklmnopqrst"; // 20 chars — valid token

const fakeGmailPort = {
  send: async (_params: unknown) => ({
    messageId: "gmail-e2e-001",
    threadId: "thread-e2e-001",
  }),
  pollHistory: async (_userId: string, _historyId: string) => [],
  getProfile: async (_userId: string) => ({
    emailAddress: "user@example.com",
    historyId: "12345",
  }),
  getMessage: async (_userId: string, _messageId: string) => null,
};

const fakeGoogleOAuthPort = {
  getValidToken: async (_userId: string) => "fake-access-token",
  storeTokens: async () => {},
};

let app: INestApplication;
let token: string;
let userId: string;
let prisma: PrismaService;

beforeAll(async () => {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GmailPort)
    .useValue(fakeGmailPort)
    .overrideProvider(GoogleOAuthPort)
    .useValue(fakeGoogleOAuthPort)
    .compile();

  app = module.createNestApplication();
  await app.init();

  prisma = module.get(PrismaService);
  const jwt = module.get(JwtService);

  const user = await prisma.user.upsert({
    where: { email: "e2e-email@test.com" },
    update: {},
    create: {
      email: "e2e-email@test.com",
      name: "E2E Email User",
      password: "hashed",
      role: "sdr",
    },
  });

  // Singleton Google token with no history yet (first-run sync scenario)
  await prisma.googleToken.upsert({
    where: { id: "google-token-singleton" },
    update: { gmailHistoryId: null },
    create: {
      id: "google-token-singleton",
      accessToken: "a", refreshToken: "r", expiresAt: new Date(Date.now() + 3600_000),
      scope: "s", email: "e2e-email@test.com", gmailHistoryId: null,
    },
  });

  userId = user.id;
  token = jwt.sign({ sub: user.id, name: user.name, email: user.email, role: user.role });
});

afterAll(async () => {
  await prisma.googleToken.deleteMany({ where: { id: "google-token-singleton" } });
  await app.close();
});

describe("Email Auth Guard", () => {
  it("POST /email/send without token → 401", () => {
    return request(app.getHttpServer())
      .post("/email/send")
      .send({ to: "dest@example.com", subject: "Hi", bodyHtml: "<p>Hi</p>" })
      .expect(401);
  });

  it("GET /email/messages without token → 401", () => {
    return request(app.getHttpServer())
      .get("/email/messages")
      .expect(401);
  });
});

describe("POST /email/send", () => {
  it("sends email with all required fields → 201 { ok: true }", () => {
    return request(app.getHttpServer())
      .post("/email/send")
      .set("Authorization", `Bearer ${token}`)
      .send({
        to: "destinatario@example.com",
        subject: "Proposta Comercial",
        bodyHtml: "<p>Olá, segue nossa proposta.</p>",
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
        expect(res.body.messageId).toBe("gmail-e2e-001");
        expect(res.body.threadId).toBe("thread-e2e-001");
      });
  });

  it("sends email with optional threadId (reply) → 201 { ok: true }", () => {
    return request(app.getHttpServer())
      .post("/email/send")
      .set("Authorization", `Bearer ${token}`)
      .send({
        to: "destinatario@example.com",
        subject: "Re: Proposta Comercial",
        bodyHtml: "<p>Confirmo o recebimento.</p>",
        threadId: "thread-e2e-001",
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.ok).toBe(true);
      });
  });

  it("missing required field 'to' → 400", () => {
    return request(app.getHttpServer())
      .post("/email/send")
      .set("Authorization", `Bearer ${token}`)
      .send({ subject: "Sem destinatário", bodyHtml: "<p>Body</p>" })
      .expect(400);
  });

  it("missing required field 'subject' → 400", () => {
    return request(app.getHttpServer())
      .post("/email/send")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "dest@example.com", bodyHtml: "<p>Body</p>" })
      .expect(400);
  });

  it("missing required field 'bodyHtml' → 400", () => {
    return request(app.getHttpServer())
      .post("/email/send")
      .set("Authorization", `Bearer ${token}`)
      .send({ to: "dest@example.com", subject: "Sem corpo" })
      .expect(400);
  });
});

describe("GET /email/messages", () => {
  it("returns empty array when no messages → 200", () => {
    return request(app.getHttpServer())
      .get("/email/messages")
      .set("Authorization", `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });
  });
});

describe("GET /track/open/:token (public — returns 1x1 GIF)", () => {
  it("returns 200 + image/gif for unknown token (does not expose 404)", () => {
    return request(app.getHttpServer())
      .get(`/track/open/${VALID_TRACKING_TOKEN}`)
      .expect(200)
      .expect("Content-Type", /image\/gif/);
  });

  it("returns 200 + image/gif even for short/invalid token (never errors)", () => {
    return request(app.getHttpServer())
      .get("/track/open/short")
      .expect(200)
      .expect("Content-Type", /image\/gif/);
  });

  it("does not set cookies or expose tracking info in headers", async () => {
    const res = await request(app.getHttpServer())
      .get(`/track/open/${VALID_TRACKING_TOKEN}`);
    expect(res.headers["set-cookie"]).toBeUndefined();
    expect(res.headers["cache-control"]).toMatch(/no-store/);
  });
});

describe("GET /track/click/:token (public — redirects)", () => {
  it("redirects to target url when provided → 302", () => {
    const targetUrl = "https://example.com/proposal";
    return request(app.getHttpServer())
      .get(`/track/click/${VALID_TRACKING_TOKEN}?url=${encodeURIComponent(targetUrl)}`)
      .expect(302)
      .expect("Location", targetUrl);
  });

  it("redirects to fallback when url param is missing → 302", () => {
    return request(app.getHttpServer())
      .get(`/track/click/${VALID_TRACKING_TOKEN}`)
      .expect(302);
  });
});

describe("POST /email/sync (manual Gmail poll)", () => {
  it("requires authentication", () => {
    return request(app.getHttpServer()).post("/email/sync").expect(401);
  });

  it("on first run stores the initial historyId and returns processed=0", async () => {
    const res = await request(app.getHttpServer())
      .post("/email/sync")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(res.body.processed).toBe(0);

    // The singleton token now carries the historyId from the Gmail profile fake
    const tokenRow = await prisma.googleToken.findUnique({ where: { id: "google-token-singleton" } });
    expect(tokenRow?.gmailHistoryId).toBe("12345");
  });

  it("processes a new inbound email from a known contact into an Activity (full wiring)", async () => {
    // Seed a contact owned by the e2e user so the inbound email matches
    const contact = await prisma.contact.create({
      data: { name: "Cliente Sync", email: "cliente-sync@empresa.com", ownerId: userId },
    });
    // Ensure we're past the first-run branch so pollHistory is consulted
    await prisma.googleToken.update({ where: { id: "google-token-singleton" }, data: { gmailHistoryId: "prev-1" } });

    const inbound = {
      messageId: "gmail-inbound-e2e-1",
      threadId: "thread-inbound-1",
      from: "Cliente Sync <cliente-sync@empresa.com>",
      to: "e2e-email@test.com",
      subject: "Tenho interesse",
      bodyText: "Olá, gostaria de saber mais.",
      bodyHtml: "<p>Olá</p>",
      receivedAt: new Date(),
    };
    const originalPoll = fakeGmailPort.pollHistory;
    fakeGmailPort.pollHistory = async () => [inbound] as never;

    try {
      const res = await request(app.getHttpServer())
        .post("/email/sync")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);
      expect(res.body.processed).toBe(1);

      const activity = await prisma.activity.findFirst({ where: { emailMessageId: "gmail-inbound-e2e-1" } });
      expect(activity).not.toBeNull();
      expect(activity?.type).toBe("email");
      expect(activity?.contactId).toBe(contact.id);

      // Notification was created and links to the contact page
      const notif = await prisma.notification.findFirst({ where: { userId, type: "EMAIL_RECEIVED" } });
      expect(notif).not.toBeNull();
      expect(JSON.parse(notif!.payload ?? "{}").link).toBe(`/contacts/${contact.id}`);
    } finally {
      fakeGmailPort.pollHistory = originalPoll;
      await prisma.notification.deleteMany({ where: { userId, type: "EMAIL_RECEIVED" } });
      await prisma.emailMessage.deleteMany({ where: { ownerId: userId } }).catch(() => {});
      await prisma.activity.deleteMany({ where: { emailMessageId: "gmail-inbound-e2e-1" } });
      await prisma.contact.deleteMany({ where: { id: contact.id } });
    }
  });

  it("processes a bounce: marks the recipient BOUNCED and suppresses the email (full wiring)", async () => {
    const bouncedEmail = "bounce-e2e@empresa.com";
    const campaign = await prisma.emailCampaign.create({
      data: { name: "Camp Bounce E2E", fromEmail: "e2e-email@test.com", ownerId: userId },
    });
    const recipient = await prisma.emailCampaignRecipient.create({
      data: { campaignId: campaign.id, recipientType: "LEAD", recipientId: "lead-x", email: bouncedEmail, status: "ACTIVE" },
    });
    await prisma.googleToken.update({ where: { id: "google-token-singleton" }, data: { gmailHistoryId: "prev-2" } });

    const bounceMsg = {
      messageId: "gmail-bounce-e2e-1",
      threadId: "thread-bounce-1",
      from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
      to: "e2e-email@test.com",
      subject: "Delivery Status Notification (Failure)",
      bodyText: `Final-Recipient: rfc822; ${bouncedEmail}\nStatus: 5.1.1`,
      bodyHtml: "",
      receivedAt: new Date(),
    };
    const originalPoll = fakeGmailPort.pollHistory;
    fakeGmailPort.pollHistory = async () => [bounceMsg] as never;

    try {
      await request(app.getHttpServer())
        .post("/email/sync")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const updatedRecipient = await prisma.emailCampaignRecipient.findUnique({ where: { id: recipient.id } });
      expect(updatedRecipient?.status).toBe("BOUNCED");

      const suppression = await prisma.emailSuppression.findFirst({ where: { email: bouncedEmail, ownerId: userId } });
      expect(suppression).not.toBeNull();
      expect(suppression?.reason).toBe("bounced");
    } finally {
      fakeGmailPort.pollHistory = originalPoll;
      await prisma.emailSuppression.deleteMany({ where: { ownerId: userId, email: bouncedEmail } });
      await prisma.emailCampaignRecipient.deleteMany({ where: { campaignId: campaign.id } });
      await prisma.emailCampaign.deleteMany({ where: { id: campaign.id } });
    }
  });

  it("processes a bounce of a 1:1 send: fails the outbound activity and notifies (full wiring)", async () => {
    const bouncedEmail = "compras-1to1-e2e@cliente.com.br";
    const threadId = "thread-1to1-e2e-1";

    // A lead owned by the e2e user, with an outbound 1:1 email activity (as the
    // frontend creates it: type "email", emailThreadId set, completed, no emailFromAddress)
    const lead = await prisma.lead.create({
      data: { businessName: "Cliente 1:1 E2E", ownerId: userId },
    });
    const activity = await prisma.activity.create({
      data: {
        ownerId: userId,
        type: "email",
        subject: "Apresentação WB",
        emailSubject: "Apresentação WB",
        emailThreadId: threadId,
        emailMessageId: "gmail-sent-1to1-e2e-1",
        completed: true,
        completedAt: new Date(),
        leadId: lead.id,
      },
    });
    await prisma.googleToken.update({ where: { id: "google-token-singleton" }, data: { gmailHistoryId: "prev-3" } });

    const bounceMsg = {
      messageId: "gmail-bounce-1to1-e2e-1",
      threadId, // Gmail threads the NDR with the original send
      from: "Mail Delivery Subsystem <mailer-daemon@googlemail.com>",
      to: "e2e-email@test.com",
      subject: "Delivery Status Notification (Failure)",
      bodyText: `Final-Recipient: rfc822; ${bouncedEmail}\nAction: failed\nStatus: 5.7.0\nDiagnostic-Code: smtp; 554 Rejected by URIBL.`,
      bodyHtml: "",
      receivedAt: new Date(),
    };
    const originalPoll = fakeGmailPort.pollHistory;
    fakeGmailPort.pollHistory = async () => [bounceMsg] as never;

    try {
      await request(app.getHttpServer())
        .post("/email/sync")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const updated = await prisma.activity.findUnique({ where: { id: activity.id } });
      expect(updated?.failedAt).not.toBeNull();
      expect(updated?.completed).toBe(false);
      expect(updated?.failReason).toContain("554 Rejected by URIBL");

      const notif = await prisma.notification.findFirst({ where: { userId, type: "EMAIL_BOUNCED" } });
      expect(notif).not.toBeNull();
      expect(JSON.parse(notif!.payload ?? "{}").link).toBe(`/leads/${lead.id}`);
    } finally {
      fakeGmailPort.pollHistory = originalPoll;
      await prisma.notification.deleteMany({ where: { userId, type: "EMAIL_BOUNCED" } });
      await prisma.emailSuppression.deleteMany({ where: { ownerId: userId, email: bouncedEmail } });
      await prisma.emailMessage.deleteMany({ where: { ownerId: userId } }).catch(() => {});
      await prisma.activity.deleteMany({ where: { id: activity.id } });
      await prisma.lead.deleteMany({ where: { id: lead.id } });
    }
  });
});
