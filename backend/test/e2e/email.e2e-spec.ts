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
});
